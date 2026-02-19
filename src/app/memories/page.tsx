'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Memory {
  name: string;
  path: string;
  content: string;
  lastModified: string;
  type: 'long-term' | 'daily';
}

function MemoriesContent() {
  const searchParams = useSearchParams();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      const data = await res.json();
      setMemories(data.memories || []);
      
      const filePath = searchParams.get('file');
      if (filePath) {
        const mem = (data.memories || []).find((m: Memory) => m.path === filePath);
        if (mem) {
          setSelectedMemory(mem);
          setEditContent(mem.content);
        }
      } else if (data.memories?.length > 0) {
        setSelectedMemory(data.memories[0]);
        setEditContent(data.memories[0].content);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [searchParams]);

  const selectMemory = (mem: Memory) => {
    setSelectedMemory(mem);
    setEditContent(mem.content);
    setEditing(false);
    setShowSidebar(false);
  };

  const saveMemory = async () => {
    if (!selectedMemory || !editContent.trim()) return;
    
    setSaving(true);
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedMemory.path,
          content: editContent,
          type: selectedMemory.type,
        }),
      });
      
      setSelectedMemory({ ...selectedMemory, content: editContent });
      setEditing(false);
      fetchMemories();
    } catch (error) {
      console.error('Failed to save memory:', error);
    } finally {
      setSaving(false);
    }
  };

  const createDailyNote = async () => {
    const today = new Date().toISOString().split('T')[0];
    const exists = memories.some(m => m.path === `memory/${today}.md`);
    
    if (exists) {
      alert('Today\'s note already exists');
      return;
    }
    
    const newMemory = {
      path: `memory/${today}.md`,
      content: `# ${today}\n\n`,
      type: 'daily' as const,
    };
    
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemory),
      });
      
      fetchMemories();
    } catch (error) {
      console.error('Failed to create daily note:', error);
    }
  };

  if (loading) {
    return <div className="text-zinc-400">Loading memories...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold">Memories</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="sm:hidden bg-zinc-800 px-3 py-2 rounded-lg font-medium transition"
          >
            📂
          </button>
          <button
            onClick={createDailyNote}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base"
          >
            + Today
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Sidebar - Hidden on mobile unless toggled */}
        <div className={`
          lg:col-span-1 bg-zinc-900 rounded-lg p-3 sm:p-4 border border-zinc-800
          fixed inset-0 z-50 bg-zinc-950/95 lg:bg-transparent lg:static lg:z-auto
          ${showSidebar ? 'block' : 'hidden lg:block'}
        `}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-zinc-300 text-sm sm:text-base">
              Your Memories ({memories.length})
            </h3>
            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden text-zinc-400 p-2"
            >
              ✕
            </button>
          </div>
          {memories.length === 0 ? (
            <p className="text-zinc-500 text-sm">No memories yet. Chat with Alfred to build them!</p>
          ) : (
            <div className="space-y-1 max-h-[60vh] lg:max-h-[70vh] overflow-auto">
              {memories.map(mem => (
                <button
                  key={mem.path}
                  onClick={() => selectMemory(mem)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
                    selectedMemory?.path === mem.path 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{mem.type === 'long-term' ? '🧠' : '📅'}</span>
                    <span className="truncate">{mem.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 bg-zinc-900 rounded-lg p-3 sm:p-6 border border-zinc-800">
          {selectedMemory ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                <h3 className="text-lg sm:text-xl font-semibold">{selectedMemory.name}</h3>
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className="text-zinc-400 text-xs sm:text-sm hidden sm:block">
                    {new Date(selectedMemory.lastModified).toLocaleString()}
                  </span>
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-blue-400 text-sm"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(false);
                          setEditContent(selectedMemory.content);
                        }}
                        className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-400 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveMemory}
                        disabled={saving}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-white text-sm"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {editing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 sm:p-4 text-zinc-300 font-mono text-sm min-h-[50vh] sm:min-h-[60vh]"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-zinc-300 font-mono text-sm bg-zinc-950 p-3 sm:p-4 rounded-lg border border-zinc-800 overflow-auto max-h-[60vh] sm:max-h-[70vh]">
                  {selectedMemory.content || '(empty)'}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-zinc-400 text-center py-8 sm:py-12">
              No memories yet. Start by chatting with Alfred!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MemoriesPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400">Loading memories...</div>}>
      <MemoriesContent />
    </Suspense>
  );
}
