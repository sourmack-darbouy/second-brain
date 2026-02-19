'use client';

import { useEffect, useState } from 'react';

interface Memory {
  name: string;
  path: string;
  content: string;
  lastModified: string;
  type: 'long-term' | 'daily';
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
  urgent: boolean;
  important: boolean;
}

interface Document {
  name: string;
  path: string;
  type: string;
}

export default function Dashboard() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [memRes, taskRes, docRes] = await Promise.all([
          fetch('/api/memories'),
          fetch('/api/tasks'),
          fetch('/api/documents'),
        ]);
        
        const memData = await memRes.json();
        const taskData = await taskRes.json();
        const docData = await docRes.json();

        setMemories(memData.memories || []);
        setTasks(taskData.tasks || []);
        setRecentDocs((docData.documents || []).slice(0, 10));
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading your brain...</div>
      </div>
    );
  }

  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const dailyMemories = memories.filter(m => m.type === 'daily').slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold">Dashboard</h2>
        <div className="text-zinc-400 text-sm sm:text-base">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats - 2x2 grid on mobile, 4 cols on tablet+ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-zinc-900 rounded-lg p-3 sm:p-4 border border-zinc-800">
          <div className="text-zinc-400 text-xs sm:text-sm">Memories</div>
          <div className="text-xl sm:text-2xl font-bold">{memories.length}</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-3 sm:p-4 border border-zinc-800">
          <div className="text-zinc-400 text-xs sm:text-sm">Active Tasks</div>
          <div className="text-xl sm:text-2xl font-bold">{incompleteTasks.length}</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-3 sm:p-4 border border-zinc-800">
          <div className="text-zinc-400 text-xs sm:text-sm">Completed</div>
          <div className="text-xl sm:text-2xl font-bold text-green-500">{completedTasks.length}</div>
        </div>
        <div className="bg-zinc-900 rounded-lg p-3 sm:p-4 border border-zinc-800">
          <div className="text-zinc-400 text-xs sm:text-sm">Documents</div>
          <div className="text-xl sm:text-2xl font-bold">{recentDocs.length}+</div>
        </div>
      </div>

      {/* Tasks Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <span>✅</span> Tasks to Complete
          </h3>
          {incompleteTasks.length === 0 ? (
            <p className="text-zinc-400 text-sm">No pending tasks. Great job!</p>
          ) : (
            <ul className="space-y-2">
              {incompleteTasks.slice(0, 5).map(task => {
                // Determine quadrant color
                const isDo = task.important && task.urgent;
                const isDecide = task.important && !task.urgent;
                const isDelegate = !task.important && task.urgent;
                const dotColor = isDo ? 'bg-red-500' : isDecide ? 'bg-blue-500' : isDelegate ? 'bg-yellow-500' : 'bg-zinc-500';
                
                return (
                  <li key={task.id} className="flex items-start gap-2 text-sm sm:text-base">
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                    <span className="line-clamp-2">{task.text}</span>
                  </li>
                );
              })}
              {incompleteTasks.length > 5 && (
                <li className="text-zinc-400 text-sm">
                  +{incompleteTasks.length - 5} more...
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <span>📝</span> Recent Daily Notes
          </h3>
          {dailyMemories.length === 0 ? (
            <p className="text-zinc-400 text-sm">No daily notes yet.</p>
          ) : (
            <ul className="space-y-2">
              {dailyMemories.map(mem => (
                <li key={mem.path}>
                  <a 
                    href={`/memories?file=${encodeURIComponent(mem.path)}`}
                    className="text-blue-400 hover:text-blue-300 flex items-center justify-between text-sm sm:text-base"
                  >
                    <span className="truncate">{mem.name}</span>
                    <span className="text-zinc-500 text-xs sm:text-sm flex-shrink-0 ml-2">
                      {new Date(mem.lastModified).toLocaleDateString()}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick Access Documents */}
      <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <span>📄</span> Recent Documents
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {recentDocs.slice(0, 6).map(doc => (
            <a
              key={doc.path}
              href={`/documents?file=${encodeURIComponent(doc.path)}`}
              className="bg-zinc-800 rounded p-3 hover:bg-zinc-700 transition border border-zinc-700 active:bg-zinc-600"
            >
              <div className="font-medium truncate text-sm sm:text-base">{doc.name}</div>
              <div className="text-zinc-400 text-xs sm:text-sm">{doc.type}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
