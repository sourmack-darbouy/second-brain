import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Full backup export - returns all data as JSON
export async function GET() {
  try {
    const timestamp = new Date().toISOString();
    
    // Get all daily memories
    const dailyList = await redis.get<string[]>('memories:daily:list') || [];
    const dailyMemories: { date: string; content: string; meta: any }[] = [];
    
    // Fetch all in parallel for speed
    const memoryPromises = dailyList.map(async (date) => {
      const content = await redis.get<string>(`memories:daily:${date}`);
      const meta = await redis.get<any>(`memories:daily:${date}:meta`);
      return content ? { date, content, meta } : null;
    });
    
    const memoryResults = await Promise.all(memoryPromises);
    for (const mem of memoryResults) {
      if (mem) dailyMemories.push(mem);
    }
    
    // Get long-term memory
    const longTermContent = await redis.get<string>('memories:longterm');
    const longTermMeta = await redis.get<any>('memories:longterm:meta');
    
    // Build backup object
    const backup = {
      version: '2.0',
      timestamp,
      source: 'second-brain-theta-ebon.vercel.app',
      data: {
        memories: {
          daily: dailyMemories.sort((a, b) => b.date.localeCompare(a.date)),
          longTerm: longTermContent ? { content: longTermContent, meta: longTermMeta } : null,
        },
      },
      stats: {
        totalMemories: dailyMemories.length,
      },
    };
    
    return NextResponse.json(backup);
  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json({ error: 'Backup failed', details: String(error) }, { status: 500 });
  }
}
