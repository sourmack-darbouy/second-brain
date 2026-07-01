import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Lightweight list endpoint - returns metadata only, no content
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeContent = searchParams.get('content') === 'true';
  const limit = parseInt(searchParams.get('limit') || '0');
  
  const memories: any[] = [];

  // Get long-term memory (always include, it's small)
  const longTermContent = await redis.get<string>('memories:longterm');
  const longTermMeta = await redis.get<{ lastModified: string }>('memories:longterm:meta');
  
  if (longTermContent) {
    memories.push({
      name: 'Long-term Memory',
      path: 'MEMORY.md',
      content: longTermContent,
      lastModified: longTermMeta?.lastModified || new Date().toISOString(),
      type: 'long-term',
    });
  }

  // Get list of daily notes (just dates)
  const dailyList = await redis.get<string[]>('memories:daily:list') || [];
  const sortedList = dailyList.sort().reverse();
  const listToProcess = limit > 0 ? sortedList.slice(0, limit) : sortedList;
  
  if (includeContent) {
    // Full mode - fetch content (slow for large lists)
    for (const date of listToProcess) {
      const content = await redis.get<string>(`memories:daily:${date}`);
      const meta = await redis.get<{ lastModified: string }>(`memories:daily:${date}:meta`);
      
      if (content) {
        memories.push({
          name: date,
          path: `memory/${date}.md`,
          content,
          lastModified: meta?.lastModified || new Date().toISOString(),
          type: 'daily',
        });
      }
    }
  } else {
    // Light mode - metadata only (fast)
    // Batch fetch just the metadata
    const metaKeys = listToProcess.map(d => `memories:daily:${d}:meta`);
    const metas = await Promise.all(
      metaKeys.map(key => redis.get<{ lastModified: string }>(key))
    );
    
    for (let i = 0; i < listToProcess.length; i++) {
      const date = listToProcess[i];
      const meta = metas[i];
      
      memories.push({
        name: date,
        path: `memory/${date}.md`,
        lastModified: meta?.lastModified || new Date().toISOString(),
        type: 'daily',
        // No content - load on demand
      });
    }
  }

  return NextResponse.json({ 
    memories,
    total: dailyList.length,
    mode: includeContent ? 'full' : 'light'
  });
}

export async function POST(request: Request) {
  const { path, content, type, attachments, mode = 'append', customer } = await request.json();
  const now = new Date().toISOString();

  // Extract customer from memory content if not provided
  const extractCustomer = (contentStr: string): string => {
    // Extract from [[Company Name]] or [[Company (Name)]] patterns
    const companyMatch = contentStr.match(/\[\[([^(]+)\]\]/);
    if (companyMatch) {
      return companyMatch[1].trim();
    }
    return '';
  };

  const slugify = (value: string): string =>
    value
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

  const extractTitle = (contentStr: string): string => {
    const headingMatch = contentStr.match(/^#\s+(.+)$/m);
    return headingMatch?.[1]?.trim() || '';
  };

  const buildDailySlug = (requestedSlug: string, contentStr: string, companyName: string): string => {
    const dateOnlyMatch = requestedSlug.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (!dateOnlyMatch) return requestedSlug;

    const date = dateOnlyMatch[1];
    const title = extractTitle(contentStr);
    const titleWithoutDate = title
      .replace(new RegExp('^' + date + '\\s*[-:]?\\s*'), '')
      .trim();

    const source = companyName || titleWithoutDate;
    if (!source || source === date) return requestedSlug;

    const suffix = slugify(source);
    return suffix ? `${date}-${suffix}` : requestedSlug;
  };

  // Format action items with customer name appended
  const formatActionItems = (contentStr: string, companyName: string): string => {
    // Split by action items list (using - [ ] format)
    const parts = contentStr.split(/\n(?!.*- \[ \])/m); // Split but don't break inside nested lists
    
    return parts.map(part => {
      // Check if part contains action items
      const hasActionItems = /- \[\]/.test(part);
      
      if (hasActionItems && companyName) {
        // Append company name to action items section
        return part + (part.endsWith('\n') ? '' : '\n') + `\n**${companyName}** - Action items will be automatically appended with company name for task tracking`;
      }
      return part;
    }).join('\n');
  };

  if (type === 'long-term' || path === 'MEMORY.md') {
    // For long-term memory, check if exists and handle append
    const existing = await redis.get<string>('memories:longterm');
    let finalContent = content;
    
    if (existing && mode === 'append') {
      // Append with separator
      finalContent = existing + '\n\n---\n\n' + content;
    }
    
    await redis.set('memories:longterm', finalContent);
    await redis.set('memories:longterm:meta', { lastModified: now });
    if (attachments !== undefined) {
      await redis.set('memories:attachments:MEMORY.md', attachments);
    }
    
    return NextResponse.json({ 
      success: true, 
      action: existing && mode === 'append' ? 'appended' : 'created',
      wasExisting: !!existing
    });
  } else {
    // Extract date from path like "memory/2024-01-15.md"
    const requestedDate = path.replace('memory/', '').replace('.md', '');

    // Determine customer name
    const companyName = customer || extractCustomer(content);
    const date = buildDailySlug(requestedDate, content, companyName);
    
    // Check if memory already exists for this date
    const existingContent = await redis.get<string>(`memories:daily:${date}`);
    let finalContent = content;
    let action = 'created';
    
    if (existingContent) {
      if (mode === 'append') {
        // Append new content with timestamp separator
        const timestamp = new Date().toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/Berlin'
        });
        
        // Format action items with customer name for new content
        let formattedContent = content;
        if (companyName) {
          formattedContent = formatActionItems(content, companyName);
        }
        
        finalContent = existingContent + `\n\n---\n\n## Added at ${timestamp}\n\n` + formattedContent;
        action = 'appended';
      } else if (mode === 'overwrite') {
        // Re-format action items with customer name
        let formattedContent = content;
        if (companyName) {
          formattedContent = formatActionItems(content, companyName);
        }
        finalContent = formattedContent;
        action = 'overwritten';
      } else if (mode === 'check') {
        // Just check if exists, don't modify
        return NextResponse.json({ 
          exists: true, 
          existingContent,
          preview: existingContent.substring(0, 500) + (existingContent.length > 500 ? '...' : '')
        });
      }
    } else {
      // New memory - format action items with customer name
      if (companyName) {
        finalContent = formatActionItems(content, companyName);
      }
    }
    
    await redis.set(`memories:daily:${date}`, finalContent);
    await redis.set(`memories:daily:${date}:meta`, { lastModified: now });
    
    // Update list
    const list = await redis.get<string[]>('memories:daily:list') || [];
    if (!list.includes(date)) {
      await redis.set('memories:daily:list', [...list, date]);
    }
    
    // Save attachments (merge if appending)
    if (attachments !== undefined) {
      if (mode === 'append') {
        const existingAttachments = await redis.get<any[]>(`memories:attachments:memory/${date}.md`) || [];
        await redis.set(`memories:attachments:memory/${date}.md`, [...existingAttachments, ...attachments]);
      } else {
        await redis.set(`memories:attachments:memory/${date}.md`, attachments);
      }
    }

    return NextResponse.json({ 
      success: true, 
      action,
      wasExisting: !!existingContent,
      date,
      customer: companyName
    });
  }
}

export async function DELETE(request: Request) {
  const { path } = await request.json();
  
  // Prevent deleting long-term memory
  if (path === 'MEMORY.md') {
    return NextResponse.json({ error: 'Cannot delete long-term memory' }, { status: 400 });
  }
  
  // Extract date from path
  const date = path.replace('memory/', '').replace('.md', '');
  
  // Delete content and metadata
  await redis.del(`memories:daily:${date}`);
  await redis.del(`memories:daily:${date}:meta`);
  await redis.del(`memories:attachments:memory/${date}.md`);
  
  // Remove from list
  const list = await redis.get<string[]>('memories:daily:list') || [];
  const filtered = list.filter(d => d !== date);
  await redis.set('memories:daily:list', filtered);
  
  return NextResponse.json({ success: true });
}
