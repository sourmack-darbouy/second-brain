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
  const { path, content, type, attachments } = await request.json();
  const now = new Date().toISOString();

  if (type === 'long-term' || path === 'MEMORY.md') {
    await redis.set('memories:longterm', content);
    await redis.set('memories:longterm:meta', { lastModified: now });
    if (attachments !== undefined) {
      await redis.set('memories:attachments:MEMORY.md', attachments);
    }
  } else {
    // Extract date from path like "memory/2024-01-15.md"
    const date = path.replace('memory/', '').replace('.md', '');
    await redis.set(`memories:daily:${date}`, content);
    await redis.set(`memories:daily:${date}:meta`, { lastModified: now });
    
    // Update list
    const list = await redis.get<string[]>('memories:daily:list') || [];
    if (!list.includes(date)) {
      await redis.set('memories:daily:list', [...list, date]);
    }
    
    // Save attachments
    if (attachments !== undefined) {
      await redis.set(`memories:attachments:memory/${date}.md`, attachments);
    }
  }

  return NextResponse.json({ success: true });
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
