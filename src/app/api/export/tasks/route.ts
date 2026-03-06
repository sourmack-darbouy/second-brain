import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET() {
  try {
    // Fetch all tasks
    const tasksData = await redis.get('tasks');
    const tasks = (tasksData as any[]) || [];

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(tasks, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="second-brain-tasks-${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export tasks' },
      { status: 500 }
    );
  }
}
