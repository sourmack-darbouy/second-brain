import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// GET: Get cached tags (fast)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  // Get all tags with counts (from cache)
  if (action === 'tags') {
    try {
      // Try to get cached tags first
      const cachedTags = await redis.get<{ name: string; count: number }[]>('cache:tags');
      if (cachedTags) {
        return NextResponse.json({ tags: cachedTags });
      }
      
      // If no cache, return empty and trigger background rebuild
      // Don't wait for it - return fast
      return NextResponse.json({ tags: [] });
    } catch (error) {
      return NextResponse.json({ tags: [] });
    }
  }
  
  // Get tag suggestions for content (fast, local)
  if (action === 'suggest-tags') {
    const content = searchParams.get('content') || '';
    const suggestions: string[] = [];
    const lower = content.toLowerCase();
    
    if (lower.includes('tender') || lower.includes('rfp')) suggestions.push('tender');
    if (lower.includes('partner')) suggestions.push('partner');
    if (lower.includes('deal') || lower.includes('contract')) suggestions.push('deal');
    if (lower.includes('follow up') || lower.includes('follow-up')) suggestions.push('follow-up');
    if (lower.includes('meeting') || lower.includes('call')) suggestions.push('meeting');
    if (lower.includes('quote') || lower.includes('pricing')) suggestions.push('pricing');
    if (lower.includes('lorawan')) suggestions.push('lorawan');
    if (lower.includes('iot')) suggestions.push('iot');
    if (lower.includes('mining')) suggestions.push('mining');
    if (lower.includes('utilities')) suggestions.push('utilities');
    
    return NextResponse.json({ suggestions });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// POST: Rebuild tag cache (run in background)
export async function POST(request: Request) {
  const { action, memoryPath, content, tags: newTags } = await request.json();
  
  if (action === 'reindex' && newTags) {
    // Update tag counts for a specific memory
    for (const tag of newTags) {
      const tagMemories = await redis.get<string[]>(`tags:${tag}:memories`) || [];
      if (!tagMemories.includes(memoryPath)) {
        tagMemories.push(memoryPath);
        await redis.set(`tags:${tag}:memories`, tagMemories);
      }
    }
    return NextResponse.json({ success: true });
  }
  
  if (action === 'rebuild-cache') {
    // Rebuild entire tag cache (slow, run as background job)
    const dailyList = await redis.get<string[]>('memories:daily:list') || [];
    const tagCounts: Record<string, number> = {};
    
    for (const date of dailyList) {
      const content = await redis.get<string>(`memories:daily:${date}`);
      if (content) {
        // Extract tags
        const tagRegex = /#([a-zA-Z0-9_-]+)/g;
        let match;
        while ((match = tagRegex.exec(content)) !== null) {
          const tag = match[1].toLowerCase();
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
    
    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    // Cache for 1 hour
    await redis.set('cache:tags', tags, { ex: 3600 });
    
    return NextResponse.json({ success: true, tags });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
