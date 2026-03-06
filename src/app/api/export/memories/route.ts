import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET() {
  try {
    // Fetch all memories
    const memoriesData = await redis.get('memories');
    const memories = (memoriesData as any[]) || [];

    // Generate Markdown content
    let markdown = '# Second Brain - Memory Export\n\n';
    markdown += `Exported on: ${new Date().toISOString()}\n\n`;
    markdown += `Total memories: ${memories.length}\n\n`;
    markdown += '---\n\n';

    // Sort by last modified (newest first)
    const sorted = [...memories].sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    for (const memory of sorted) {
      markdown += `# ${memory.name}\n\n`;
      markdown += `**Type:** ${memory.type}\n`;
      markdown += `**Path:** ${memory.path}\n`;
      markdown += `**Last Modified:** ${memory.lastModified}\n`;
      
      if (memory.attachments && memory.attachments.length > 0) {
        markdown += `**Attachments:** ${memory.attachments.join(', ')}\n`;
      }
      
      markdown += '\n---\n\n';
      markdown += memory.content;
      markdown += '\n\n---\n\n';
    }

    // Return as downloadable file
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="second-brain-memories-${new Date().toISOString().split('T')[0]}.md"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export memories' },
      { status: 500 }
    );
  }
}
