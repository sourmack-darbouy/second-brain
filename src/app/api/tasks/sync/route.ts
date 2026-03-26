import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

interface Task {
  id: string;
  text: string;
  completed: boolean;
  sourceMemoryPath?: string;
  sourceActionText?: string;
}

// Sync task completion to memory
export async function POST(request: Request) {
  const { taskId, completed } = await request.json();
  
  // Get the task
  const tasks = await redis.get<Task[]>('tasks') || [];
  const task = tasks.find(t => t.id === taskId);
  
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }
  
  // Update task completion status
  const updatedTasks = tasks.map(t => 
    t.id === taskId ? { ...t, completed } : t
  );
  await redis.set('tasks', updatedTasks);
  
  // If task has a source memory and is being completed, update the memory
  if (task.sourceMemoryPath && task.sourceActionText && completed) {
    const memoryKey = task.sourceMemoryPath === 'MEMORY.md' 
      ? 'memories:longterm'
      : `memories:daily:${task.sourceMemoryPath.replace('memory/', '').replace('.md', '')}`;
    
    const content = await redis.get<string>(memoryKey);
    
    if (content) {
      // Find and replace the action item
      // Handle various checkbox formats
      const actionText = task.sourceActionText;
      const escapedText = actionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Match: - [ ] text or * [ ] text (with optional spaces)
      const checkboxRegex = new RegExp(
        `([-*])\\s*\\[\\s*\\]\\s*${escapedText}`,
        'g'
      );
      
      const updatedContent = content.replace(checkboxRegex, (match, bullet) => {
        return `${bullet} [x] ${actionText}`;
      });
      
      if (updatedContent !== content) {
        await redis.set(memoryKey, updatedContent);
        
        // Update memory metadata
        const metaKey = task.sourceMemoryPath === 'MEMORY.md'
          ? 'memories:longterm:meta'
          : `memories:daily:${task.sourceMemoryPath.replace('memory/', '').replace('.md', '')}:meta`;
        await redis.set(metaKey, { lastModified: new Date().toISOString() });
        
        return NextResponse.json({ 
          success: true, 
          synced: true,
          message: `Marked as complete in ${task.sourceMemoryPath}`
        });
      }
    }
  }
  
  return NextResponse.json({ 
    success: true, 
    synced: false,
    message: task.sourceMemoryPath 
      ? 'Task updated but memory sync failed (action item not found)'
      : 'Task updated (no source memory to sync)'
  });
}
