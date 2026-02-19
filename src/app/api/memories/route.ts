import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

interface Memory {
  name: string;
  path: string;
  content: string;
  lastModified: string;
  type: 'long-term' | 'daily';
  attachments?: string[]; // paths to attached documents
}

interface Attachment {
  documentPath: string;
  memoryPath: string;
  attachedAt: string;
}

export async function GET() {
  const memories: Memory[] = [];

  // Get long-term memory
  const longTermContent = await redis.get<string>('memories:longterm');
  const longTermMeta = await redis.get<{ lastModified: string }>('memories:longterm:meta');
  const longTermAttachments = await redis.get<string[]>(`memories:attachments:MEMORY.md`) || [];
  
  if (longTermContent) {
    memories.push({
      name: 'Long-term Memory',
      path: 'MEMORY.md',
      content: longTermContent,
      lastModified: longTermMeta?.lastModified || new Date().toISOString(),
      type: 'long-term',
      attachments: longTermAttachments,
    });
  }

  // Get list of daily notes
  const dailyList = await redis.get<string[]>('memories:daily:list') || [];
  
  for (const date of dailyList.sort().reverse()) {
    const content = await redis.get<string>(`memories:daily:${date}`);
    const meta = await redis.get<{ lastModified: string }>(`memories:daily:${date}:meta`);
    const attachments = await redis.get<string[]>(`memories:attachments:memory/${date}.md`) || [];
    
    if (content) {
      memories.push({
        name: date,
        path: `memory/${date}.md`,
        content,
        lastModified: meta?.lastModified || new Date().toISOString(),
        type: 'daily',
        attachments,
      });
    }
  }

  return NextResponse.json({ memories });
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

// Attach a document to a memory
export async function PUT(request: Request) {
  const { memoryPath, documentPath, action } = await request.json();
  
  const key = `memories:attachments:${memoryPath}`;
  const attachments = await redis.get<string[]>(key) || [];
  
  if (action === 'attach') {
    if (!attachments.includes(documentPath)) {
      attachments.push(documentPath);
      await redis.set(key, attachments);
    }
  } else if (action === 'detach') {
    const filtered = attachments.filter(p => p !== documentPath);
    await redis.set(key, filtered);
  }
  
  return NextResponse.json({ success: true, attachments });
}
