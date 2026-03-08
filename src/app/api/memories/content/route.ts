import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Get single memory content by path
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return NextResponse.json({ error: 'Path required' }, { status: 400 });
  }
  
  if (path === 'MEMORY.md') {
    // Long-term memory
    const content = await redis.get<string>('memories:longterm');
    const meta = await redis.get<{ lastModified: string }>('memories:longterm:meta');
    const attachments = await redis.get<string[]>(`memories:attachments:MEMORY.md`) || [];
    
    if (!content) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      name: 'Long-term Memory',
      path: 'MEMORY.md',
      content,
      lastModified: meta?.lastModified || new Date().toISOString(),
      type: 'long-term',
      attachments,
    });
  }
  
  // Daily memory
  const date = path.replace('memory/', '').replace('.md', '');
  const content = await redis.get<string>(`memories:daily:${date}`);
  const meta = await redis.get<{ lastModified: string }>(`memories:daily:${date}:meta`);
  const attachments = await redis.get<string[]>(`memories:attachments:memory/${date}.md`) || [];
  
  if (!content) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  return NextResponse.json({
    name: date,
    path: `memory/${date}.md`,
    content,
    lastModified: meta?.lastModified || new Date().toISOString(),
    type: 'daily',
    attachments,
  });
}
