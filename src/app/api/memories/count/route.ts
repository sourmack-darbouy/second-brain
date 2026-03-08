import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET() {
  try {
    // Just get counts, not content
    const dailyList = await redis.get<string[]>('memories:daily:list') || [];
    const hasLongTerm = await redis.exists('memories:longterm');
    
    return NextResponse.json({ 
      dailyCount: dailyList.length,
      hasLongTerm: hasLongTerm === 1,
      dates: dailyList.sort().reverse().slice(0, 10) // First 10 dates
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Clear all daily memories (fast - just clear the list)
export async function DELETE() {
  try {
    // Get the list first for reporting
    const dailyList = await redis.get<string[]>('memories:daily:list') || [];
    const count = dailyList.length;
    
    // Clear the list - this makes all daily memories "disappear"
    await redis.del('memories:daily:list');
    
    // Clear individual keys in background (fire and forget)
    // These will be cleaned up eventually anyway
    dailyList.forEach(async (date) => {
      try {
        await redis.del(`memories:daily:${date}`);
        await redis.del(`memories:daily:${date}:meta`);
        await redis.del(`memories:attachments:memory/${date}.md`);
      } catch {}
    });
    
    return NextResponse.json({ 
      success: true, 
      deleted: count,
      note: 'List cleared, individual keys being cleaned in background'
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
