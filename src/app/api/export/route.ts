import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Export all memories as markdown
export async function GET() {
  try {
    // Get all daily memories
    const dailyList = await redis.get<string[]>('memories:daily:list') || [];
    const longTerm = await redis.get<string>('memories:longterm');
    
    // Build markdown export
    let exportContent = '# Second Brain Export\n\n';
    exportContent += `Exported: ${new Date().toISOString()}\n\n`;
    exportContent += `---\n\n`;
    
    // Add long-term memory
    if (longTerm) {
      exportContent += '## Long-term Memory\n\n';
      exportContent += longTerm;
      exportContent += '\n\n---\n\n';
    }
    
    // Add daily memories (sorted by date, newest first)
    exportContent += '## Daily Memories\n\n';
    
    const sortedDays = dailyList.sort().reverse();
    
    for (const date of sortedDays) {
      const content = await redis.get<string>(`memories:daily:${date}`);
      if (content) {
        exportContent += `### ${date}\n\n`;
        exportContent += content;
        exportContent += '\n\n---\n\n';
      }
    }
    
    // Return as downloadable file
    return new NextResponse(exportContent, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="second-brain-export-${new Date().toISOString().split('T')[0]}.md"`,
      },
    });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
