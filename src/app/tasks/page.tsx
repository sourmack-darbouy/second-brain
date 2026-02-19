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
      description: 'Crisis, deadlines',
    },
    decide: {
      title: 'Schedule',
      subtitle: 'Important',
      color: 'bg-blue-500/20 border-blue-500',
      badge: 'bg-blue-500',
      icon: '📅',
      description: 'Planning, growth',
    },
    delegate: {
      title: 'Delegate',
      subtitle: 'Urgent',
      color: 'bg-yellow-500/20 border-yellow-500',
      badge: 'bg-yellow-500',
      icon: '👥',
      description: 'Interruptions',
    },
    delete: {
      title: 'Eliminate',
      subtitle: 'Neither',
      color: 'bg-zinc-500/20 border-zinc-500',
      badge: 'bg-zinc-500',
      icon: '🗑️',
      description: 'Time wasters',
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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">Tasks</h2>
        <p className="text-zinc-400 mt-1 text-sm sm:text-base">Eisenhower Matrix — prioritize by urgency and importance</p>
      </div>

      {/* Add Task Form */}
      <form onSubmit={addTask} className="bg-zinc-900 rounded-lg p-3 sm:p-4 border border-zinc-800">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-zinc-100 placeholder-zinc-500 text-base"
              autoFocus
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 sm:px-6 py-2 rounded-lg font-medium transition touch-feedback"
            >
              Add
            </button>
          </div>

          {/* Matrix Selection - Compact on mobile */}
          <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer bg-zinc-800 px-3 py-1.5 rounded-full">
              <input
                type="checkbox"
                checked={newImportant}
                onChange={(e) => setNewImportant(e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
              <span className="text-zinc-300 text-sm">Important</span>
            </label>

            <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer bg-zinc-800 px-3 py-1.5 rounded-full">
              <input
                type="checkbox"
                checked={newUrgent}
                onChange={(e) => setNewUrgent(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-zinc-300 text-sm">Urgent</span>
            </label>

            {/* Preview quadrant */}
            <div className="ml-auto text-sm font-medium">
              {newImportant && newUrgent && (
                <span className="text-red-400">→ Do</span>
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

      {/* Eisenhower Matrix Grid - Stack on mobile, 2x2 on tablet+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Do - Urgent & Important */}
        <Quadrant
          config={quadrantConfig.do}
          tasks={doTasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onUpdateMatrix={updateTaskMatrix}
        />

        {/* Decide - Important, Not Urgent */}
        <Quadrant
          config={quadrantConfig.decide}
          tasks={decideTasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onUpdateMatrix={updateTaskMatrix}
        />

        {/* Delegate - Urgent, Not Important */}
        <Quadrant
          config={quadrantConfig.delegate}
          tasks={delegateTasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onUpdateMatrix={updateTaskMatrix}
        />

        {/* Delete - Not Urgent, Not Important */}
        <Quadrant
          config={quadrantConfig.delete}
          tasks={deleteTasks}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onUpdateMatrix={updateTaskMatrix}
        />
      </div>

      {/* Completed */}
      {completedTasks.length > 0 && (
        <div className="bg-zinc-900 rounded-lg p-3 sm:p-4 border border-zinc-800">
          <h3 className="font-semibold mb-3 text-zinc-400 flex items-center gap-2">
            <span>✅</span>
            Completed ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.map(task => (
              <div
                key={task.id}
                className="border-l-4 border-zinc-600 bg-zinc-800/50 p-2.5 sm:p-3 rounded-r"
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="mt-0.5 sm:mt-1 w-5 h-5"
                  />
                  <span className="flex-1 line-through text-zinc-500 text-sm sm:text-base">{task.text}</span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-zinc-500 hover:text-red-400 p-1"
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

// Quadrant component
function Quadrant({
  config,
  tasks,
  onToggle,
  onDelete,
  onUpdateMatrix,
}: {
  config: typeof quadrantConfig.do;
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateMatrix: (id: string, urgent: boolean, important: boolean) => void;
}) {
  return (
    <div className={`rounded-lg p-3 sm:p-4 border-2 ${config.color}`}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div>
          <h3 className="font-semibold flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
            <span>{config.icon}</span>
            {config.title}
          </h3>
          <p className="text-xs text-zinc-400 hidden sm:block">{config.description}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${config.badge} ${config.title === 'Delegate' ? 'text-black' : 'text-white'}`}>
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
            onUpdateMatrix={onUpdateMatrix}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-zinc-500 text-sm py-3 sm:py-4 text-center">No tasks</p>
        )}
      </div>
    </div>
  );
}

const quadrantConfig = {
  do: {
    title: 'Do First',
    subtitle: 'Urgent & Important',
    color: 'bg-red-500/20 border-red-500',
    badge: 'bg-red-500',
    icon: '🔥',
    description: 'Crisis, deadlines',
  },
  decide: {
    title: 'Schedule',
    subtitle: 'Important',
    color: 'bg-blue-500/20 border-blue-500',
    badge: 'bg-blue-500',
    icon: '📅',
    description: 'Planning, growth',
  },
  delegate: {
    title: 'Delegate',
    subtitle: 'Urgent',
    color: 'bg-yellow-500/20 border-yellow-500',
    badge: 'bg-yellow-500',
    icon: '👥',
    description: 'Interruptions',
  },
  delete: {
    title: 'Eliminate',
    subtitle: 'Neither',
    color: 'bg-zinc-500/20 border-zinc-500',
    badge: 'bg-zinc-500',
    icon: '🗑️',
    description: 'Time wasters',
  },
};

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
    <div className="bg-zinc-800/50 p-2.5 sm:p-3 rounded group">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          className="mt-0.5 sm:mt-1 w-5 h-5 flex-shrink-0"
        />
        <span className="flex-1 text-sm sm:text-base">{task.text}</span>
        <button
          onClick={() => onDelete(task.id)}
          className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 active:opacity-100 sm:opacity-0 p-1 -mr-1"
        >
          ✕
        </button>
      </div>
      {/* Quick move buttons - Always visible on mobile, hover on desktop */}
      <div className="flex gap-1.5 mt-2 sm:opacity-0 sm:group-hover:opacity-100 transition">
        <button
          onClick={() => onUpdateMatrix(task.id, true, true)}
          className={`text-base px-2 py-1 rounded ${quadrant === 'do' ? 'bg-red-500 text-white' : 'bg-zinc-700 active:bg-red-500/50'}`}
          title="Do First"
        >
          🔥
        </button>
        <button
          onClick={() => onUpdateMatrix(task.id, false, true)}
          className={`text-base px-2 py-1 rounded ${quadrant === 'decide' ? 'bg-blue-500 text-white' : 'bg-zinc-700 active:bg-blue-500/50'}`}
          title="Schedule"
        >
          📅
        </button>
        <button
          onClick={() => onUpdateMatrix(task.id, true, false)}
          className={`text-base px-2 py-1 rounded ${quadrant === 'delegate' ? 'bg-yellow-500 text-black' : 'bg-zinc-700 active:bg-yellow-500/50'}`}
          title="Delegate"
        >
          👥
        </button>
        <button
          onClick={() => onUpdateMatrix(task.id, false, false)}
          className={`text-base px-2 py-1 rounded ${quadrant === 'delete' ? 'bg-zinc-500 text-white' : 'bg-zinc-700 active:bg-zinc-600'}`}
          title="Eliminate"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
