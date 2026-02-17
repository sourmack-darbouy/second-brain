import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  created: string;
  due?: string;
}

export async function GET() {
  const tasks = await redis.get<Task[]>('tasks') || [];
  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const { tasks } = await request.json();
  await redis.set('tasks', tasks);
  return NextResponse.json({ success: true, tasks });
}

export async function PUT(request: Request) {
  const task = await request.json() as Task;
  const tasks = await redis.get<Task[]>('tasks') || [];
  
  const index = tasks.findIndex(t => t.id === task.id);
  if (index >= 0) {
    tasks[index] = task;
  } else {
    tasks.push(task);
  }
  
  await redis.set('tasks', tasks);
  return NextResponse.json({ success: true, tasks });
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const tasks = await redis.get<Task[]>('tasks') || [];
  const filtered = tasks.filter(t => t.id !== id);
  await redis.set('tasks', filtered);
  return NextResponse.json({ success: true, tasks: filtered });
}
