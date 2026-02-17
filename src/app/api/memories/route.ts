import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

interface Memory {
  name: string;
  path: string;
  content: string;
  lastModified: string;
  type: 'long-term' | 'daily';
}

export async function GET() {
  const memories: Memory[] = [];

  // Get long-term memory
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

  // Get list of daily notes
  const dailyList = await redis.get<string[]>('memories:daily:list') || [];
  
  for (const date of dailyList.sort().reverse()) {
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

  return NextResponse.json({ memories });
}

export async function POST(request: Request) {
  const { path, content, type } = await request.json();
  const now = new Date().toISOString();

  if (type === 'long-term' || path === 'MEMORY.md') {
    await redis.set('memories:longterm', content);
    await redis.set('memories:longterm:meta', { lastModified: now });
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
  }

  return NextResponse.json({ success: true });
}
