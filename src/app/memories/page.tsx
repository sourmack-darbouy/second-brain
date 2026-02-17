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

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      const data = await res.json();
      setMemories(data.memories || []);
      
      // Check if a specific file was requested
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Memories</h2>
        <button
          onClick={createDailyNote}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium transition"
        >
          + Today's Note
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <h3 className="font-semibold mb-3 text-zinc-300">
            Your Memories ({memories.length})
          </h3>
          {memories.length === 0 ? (
            <p className="text-zinc-500 text-sm">No memories yet. Chat with Alfred to build them!</p>
          ) : (
            <div className="space-y-1">
              {memories.map(mem => (
                <button
                  key={mem.path}
                  onClick={() => selectMemory(mem)}
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    selectedMemory?.path === mem.path 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-zinc-800 text-zinc-300'
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
        <div className="lg:col-span-3 bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          {selectedMemory ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{selectedMemory.name}</h3>
                <div className="flex items-center gap-4">
                  <span className="text-zinc-400 text-sm">
                    Last modified: {new Date(selectedMemory.lastModified).toLocaleString()}
                  </span>
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-blue-400 hover:text-blue-300"
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
                        className="text-zinc-400 hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveMemory}
                        disabled={saving}
                        className="text-green-400 hover:text-green-300"
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-4 text-zinc-300 font-mono text-sm min-h-[60vh]"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-zinc-300 font-mono text-sm bg-zinc-950 p-4 rounded border border-zinc-800 overflow-auto max-h-[70vh]">
                  {selectedMemory.content || '(empty)'}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-zinc-400 text-center py-12">
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
