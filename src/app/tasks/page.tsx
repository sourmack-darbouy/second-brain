'use client';

import { useEffect, useState, useCallback } from 'react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  urgent: boolean;
  important: boolean;
  created: string;
  quadrant?: 'do' | 'decide' | 'delegate' | 'delete';
}

// Derive quadrant from urgent/important
function getQuadrant(task: Task): 'do' | 'decide' | 'delegate' | 'delete' {
  if (task.important && task.urgent) return 'do';
  if (task.important && !task.urgent) return 'decide';
  if (!task.important && task.urgent) return 'delegate';
  return 'delete';
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [newUrgent, setNewUrgent] = useState(false);
  const [newImportant, setNewImportant] = useState(true);

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
      urgent: newUrgent,
      important: newImportant,
      created: new Date().toISOString(),
    };

    saveTasks([...tasks, task]);
    setNewTask('');
    // Reset to default for next task
    setNewUrgent(false);
    setNewImportant(true);
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

  const updateTaskMatrix = (id: string, urgent: boolean, important: boolean) => {
    const updated = tasks.map(t =>
      t.id === id ? { ...t, urgent, important } : t
    );
    saveTasks(updated);
  };

  const quadrantConfig = {
    do: {
      title: 'Do First',
      subtitle: 'Urgent & Important',
      color: 'bg-red-500/20 border-red-500',
      badge: 'bg-red-500',
      icon: '🔥',
      description: 'Crisis, deadlines, problems',
    },
    decide: {
      title: 'Schedule',
      subtitle: 'Important, Not Urgent',
      color: 'bg-blue-500/20 border-blue-500',
      badge: 'bg-blue-500',
      icon: '📅',
      description: 'Planning, prevention, growth',
    },
    delegate: {
      title: 'Delegate',
      subtitle: 'Urgent, Not Important',
      color: 'bg-yellow-500/20 border-yellow-500',
      badge: 'bg-yellow-500',
      icon: '👥',
      description: 'Interruptions, some meetings',
    },
    delete: {
      title: 'Eliminate',
      subtitle: 'Neither Urgent Nor Important',
      color: 'bg-zinc-500/20 border-zinc-500',
      badge: 'bg-zinc-500',
      icon: '🗑️',
      description: 'Time wasters, busy work',
    },
  };

  if (loading) {
    return <div className="text-zinc-400">Loading tasks...</div>;
  }

  const doTasks = tasks.filter(t => !t.completed && getQuadrant(t) === 'do');
  const decideTasks = tasks.filter(t => !t.completed && getQuadrant(t) === 'decide');
  const delegateTasks = tasks.filter(t => !t.completed && getQuadrant(t) === 'delegate');
  const deleteTasks = tasks.filter(t => !t.completed && getQuadrant(t) === 'delete');
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Tasks</h2>
        <p className="text-zinc-400 mt-1">Eisenhower Matrix — prioritize by urgency and importance</p>
      </div>

      {/* Add Task Form */}
      <form onSubmit={addTask} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-zinc-100 placeholder-zinc-500"
              autoFocus
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-medium transition"
            >
              Add
            </button>
          </div>

          {/* Matrix Selection */}
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-zinc-400 text-sm">Classify as:</span>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newImportant}
                onChange={(e) => setNewImportant(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-zinc-300">Important</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newUrgent}
                onChange={(e) => setNewUrgent(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-zinc-300">Urgent</span>
            </label>

            {/* Preview quadrant */}
            <div className="ml-auto text-sm">
              {newImportant && newUrgent && (
                <span className="text-red-400">→ Do First</span>
              )}
              {newImportant && !newUrgent && (
                <span className="text-blue-400">→ Schedule</span>
              )}
              {!newImportant && newUrgent && (
                <span className="text-yellow-400">→ Delegate</span>
              )}
              {!newImportant && !newUrgent && (
                <span className="text-zinc-400">→ Eliminate</span>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Eisenhower Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Do - Urgent & Important */}
        <div className={`rounded-lg p-4 border-2 ${quadrantConfig.do.color}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <span>{quadrantConfig.do.icon}</span>
                {quadrantConfig.do.title}
              </h3>
              <p className="text-xs text-zinc-400">{quadrantConfig.do.description}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${quadrantConfig.do.badge} text-white`}>
              {doTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {doTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onUpdateMatrix={updateTaskMatrix}
              />
            ))}
            {doTasks.length === 0 && (
              <p className="text-zinc-500 text-sm py-4 text-center">No tasks here</p>
            )}
          </div>
        </div>

        {/* Decide - Important, Not Urgent */}
        <div className={`rounded-lg p-4 border-2 ${quadrantConfig.decide.color}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <span>{quadrantConfig.decide.icon}</span>
                {quadrantConfig.decide.title}
              </h3>
              <p className="text-xs text-zinc-400">{quadrantConfig.decide.description}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${quadrantConfig.decide.badge} text-white`}>
              {decideTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {decideTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onUpdateMatrix={updateTaskMatrix}
              />
            ))}
            {decideTasks.length === 0 && (
              <p className="text-zinc-500 text-sm py-4 text-center">No tasks here</p>
            )}
          </div>
        </div>

        {/* Delegate - Urgent, Not Important */}
        <div className={`rounded-lg p-4 border-2 ${quadrantConfig.delegate.color}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <span>{quadrantConfig.delegate.icon}</span>
                {quadrantConfig.delegate.title}
              </h3>
              <p className="text-xs text-zinc-400">{quadrantConfig.delegate.description}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${quadrantConfig.delegate.badge} text-black`}>
              {delegateTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {delegateTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onUpdateMatrix={updateTaskMatrix}
              />
            ))}
            {delegateTasks.length === 0 && (
              <p className="text-zinc-500 text-sm py-4 text-center">No tasks here</p>
            )}
          </div>
        </div>

        {/* Delete - Not Urgent, Not Important */}
        <div className={`rounded-lg p-4 border-2 ${quadrantConfig.delete.color}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <span>{quadrantConfig.delete.icon}</span>
                {quadrantConfig.delete.title}
              </h3>
              <p className="text-xs text-zinc-400">{quadrantConfig.delete.description}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${quadrantConfig.delete.badge} text-white`}>
              {deleteTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {deleteTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onUpdateMatrix={updateTaskMatrix}
              />
            ))}
            {deleteTasks.length === 0 && (
              <p className="text-zinc-500 text-sm py-4 text-center">No tasks here</p>
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

// Task item component with quick matrix adjustment
function TaskItem({
  task,
  onToggle,
  onDelete,
  onUpdateMatrix,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateMatrix: (id: string, urgent: boolean, important: boolean) => void;
}) {
  const quadrant = getQuadrant(task);

  return (
    <div className="bg-zinc-800/50 p-3 rounded group">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          className="mt-1"
        />
        <span className="flex-1">{task.text}</span>
        <button
          onClick={() => onDelete(task.id)}
          className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
        >
          ✕
        </button>
      </div>
      {/* Quick move buttons */}
      <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={() => onUpdateMatrix(task.id, true, true)}
          className={`text-xs px-2 py-1 rounded ${quadrant === 'do' ? 'bg-red-500 text-white' : 'bg-zinc-700 hover:bg-red-500/50'}`}
          title="Do First"
        >
          🔥
        </button>
        <button
          onClick={() => onUpdateMatrix(task.id, false, true)}
          className={`text-xs px-2 py-1 rounded ${quadrant === 'decide' ? 'bg-blue-500 text-white' : 'bg-zinc-700 hover:bg-blue-500/50'}`}
          title="Schedule"
        >
          📅
        </button>
        <button
          onClick={() => onUpdateMatrix(task.id, true, false)}
          className={`text-xs px-2 py-1 rounded ${quadrant === 'delegate' ? 'bg-yellow-500 text-black' : 'bg-zinc-700 hover:bg-yellow-500/50'}`}
          title="Delegate"
        >
          👥
        </button>
        <button
          onClick={() => onUpdateMatrix(task.id, false, false)}
          className={`text-xs px-2 py-1 rounded ${quadrant === 'delete' ? 'bg-zinc-500 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}
          title="Eliminate"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
