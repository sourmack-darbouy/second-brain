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

// Clear all daily memories
export async function DELETE() {
  try {
    const dailyList = await redis.get<string[]>('memories:daily:list') || [];
    
    for (const date of dailyList) {
      await redis.del(`memories:daily:${date}`);
      await redis.del(`memories:daily:${date}:meta`);
      await redis.del(`memories:attachments:memory/${date}.md`);
    }
    
    await redis.del('memories:daily:list');
    
    return NextResponse.json({ 
      success: true, 
      deleted: dailyList.length 
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
