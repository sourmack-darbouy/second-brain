'use client';

import { useEffect, useState, useCallback } from 'react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  created: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const saveTasks = async (updatedTasks: Task[]) => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Failed to save tasks:', error);
    }
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const task: Task = {
      id: `task-${Date.now()}`,
      text: newTask.trim(),
      completed: false,
      priority: newPriority,
      created: new Date().toISOString(),
    };

    saveTasks([...tasks, task]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
  };

  const priorityColors = {
    high: 'border-l-red-500 bg-red-500/10',
    medium: 'border-l-yellow-500 bg-yellow-500/10',
    low: 'border-l-green-500 bg-green-500/10',
  };

  const priorityDots = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };

  if (loading) {
    return <div className="text-zinc-400">Loading tasks...</div>;
  }

  const highTasks = tasks.filter(t => t.priority === 'high' && !t.completed);
  const mediumTasks = tasks.filter(t => t.priority === 'medium' && !t.completed);
  const lowTasks = tasks.filter(t => t.priority === 'low' && !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Tasks</h2>

      {/* Add Task Form */}
      <form onSubmit={addTask} className="flex gap-3">
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-zinc-100 placeholder-zinc-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-medium transition"
        >
          Add
        </button>
      </form>

      {/* Task Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High Priority */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            High Priority ({highTasks.length})
          </h3>
          <div className="space-y-2">
            {highTasks.map(task => (
              <div
                key={task.id}
                className={`border-l-4 ${priorityColors[task.priority]} p-3 rounded-r`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="mt-1"
                  />
                  <span className="flex-1">{task.text}</span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {highTasks.length === 0 && (
              <p className="text-zinc-500 text-sm">No high priority tasks</p>
            )}
          </div>
        </div>

        {/* Medium Priority */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            Medium Priority ({mediumTasks.length})
          </h3>
          <div className="space-y-2">
            {mediumTasks.map(task => (
              <div
                key={task.id}
                className={`border-l-4 ${priorityColors[task.priority]} p-3 rounded-r`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="mt-1"
                  />
                  <span className="flex-1">{task.text}</span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {mediumTasks.length === 0 && (
              <p className="text-zinc-500 text-sm">No medium priority tasks</p>
            )}
          </div>
        </div>

        {/* Low Priority */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Low Priority ({lowTasks.length})
          </h3>
          <div className="space-y-2">
            {lowTasks.map(task => (
              <div
                key={task.id}
                className={`border-l-4 ${priorityColors[task.priority]} p-3 rounded-r`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="mt-1"
                  />
                  <span className="flex-1">{task.text}</span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {lowTasks.length === 0 && (
              <p className="text-zinc-500 text-sm">No low priority tasks</p>
            )}
          </div>
        </div>
      </div>

      {/* Completed */}
      {completedTasks.length > 0 && (
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <h3 className="font-semibold mb-3 text-zinc-400 flex items-center gap-2">
            <span>✅</span>
            Completed ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.map(task => (
              <div
                key={task.id}
                className="border-l-4 border-zinc-600 bg-zinc-800/50 p-3 rounded-r"
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="mt-1"
                  />
                  <span className="flex-1 line-through text-zinc-500">{task.text}</span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
