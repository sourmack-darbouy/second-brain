'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

interface Memory {
  name: string;
  path: string;
  content: string;
  lastModified: string;
  type: 'long-term' | 'daily';
  attachments?: string[];
}

interface Document {
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: string;
}

function MemoriesContent() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [memoryAttachments, setMemoryAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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
          setMemoryAttachments(mem.attachments || []);
        }
      } else if (data.memories?.length > 0) {
        setSelectedMemory(data.memories[0]);
        setEditContent(data.memories[0].content);
        setMemoryAttachments(data.memories[0].attachments || []);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  useEffect(() => {
    fetchMemories();
    fetchDocuments();
  }, [searchParams]);

  const selectMemory = (mem: Memory) => {
    setSelectedMemory(mem);
    setEditContent(mem.content);
    setMemoryAttachments(mem.attachments || []);
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
          attachments: memoryAttachments,
        }),
      });
      
      setSelectedMemory({ ...selectedMemory, content: editContent, attachments: memoryAttachments });
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

  const deleteMemory = async () => {
    if (!selectedMemory) return;
    
    if (selectedMemory.type === 'long-term') {
      alert('Cannot delete long-term memory');
      return;
    }
    
    if (!confirm(`Delete memory "${selectedMemory.name}"? This cannot be undone.`)) return;
    
    try {
      await fetch('/api/memories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedMemory.path }),
      });
      
      setSelectedMemory(null);
      fetchMemories();
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const toggleAttachment = async (docPath: string) => {
    const isAttached = memoryAttachments.includes(docPath);
    const newAttachments = isAttached
      ? memoryAttachments.filter(p => p !== docPath)
      : [...memoryAttachments, docPath];
    
    setMemoryAttachments(newAttachments);
    
    // Save to backend
    try {
      await fetch('/api/memories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryPath: selectedMemory?.path,
          documentPath: docPath,
          action: isAttached ? 'detach' : 'attach',
        }),
      });
    } catch (error) {
      console.error('Failed to update attachment:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    
    try {
      // Read file content
      const content = await file.text();
      
      // Create document in Second Brain
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          path: file.name,
          content: content,
        }),
      });
      
      if (res.ok) {
        // Refresh documents list
        await fetchDocuments();
        
        // Auto-attach the new document
        await toggleAttachment(file.name);
      } else {
        alert('Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file. Make sure it\'s a text-based file (txt, md, csv, json, etc.)');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return <div className="text-zinc-400">Loading memories...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Attach Document Modal */}
      {showAttachModal && selectedMemory && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[80vh] overflow-auto border border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Attach Documents</h3>
              <button
                onClick={() => setShowAttachModal(false)}
                className="text-zinc-400 hover:text-white p-2"
              >
                ✕
              </button>
            </div>
            
            {/* Upload Section */}
            <div className="mb-4 p-4 border-2 border-dashed border-zinc-700 rounded-lg hover:border-zinc-500 transition">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.yaml,.yml,.xml,.html,.css,.js,.ts,.py,.log"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center cursor-pointer py-4 ${uploading ? 'opacity-50' : ''}`}
              >
                {uploading ? (
                  <span className="text-zinc-400">Uploading...</span>
                ) : (
                  <>
                    <span className="text-3xl mb-2">📤</span>
                    <span className="text-zinc-400 text-sm text-center">
                      Click to upload a file<br/>
                      <span className="text-zinc-500 text-xs">(txt, md, csv, json, etc.)</span>
                    </span>
                  </>
                )}
              </label>
            </div>
            
            <div className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Or select existing:</div>
            
            {documents.length === 0 ? (
              <div className="text-zinc-500 text-center py-4 text-sm">
                No existing documents
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-auto">
                {documents.map(doc => {
                  const isAttached = memoryAttachments.includes(doc.path);
                  return (
                    <button
                      key={doc.path}
                      onClick={() => toggleAttachment(doc.path)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between gap-3 ${
                        isAttached
                          ? 'bg-blue-600/20 border border-blue-500 text-blue-300'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">{isAttached ? '✓' : '📄'}</span>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{doc.name}</div>
                          <div className="text-xs text-zinc-500">{doc.type} • {formatSize(doc.size)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-zinc-700 flex justify-end gap-2">
              <button
                onClick={() => setShowAttachModal(false)}
                className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    
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
          fixed inset-0 z-40 bg-zinc-950/95 lg:bg-transparent lg:static lg:z-auto
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
                    {mem.attachments && mem.attachments.length > 0 && (
                      <span className="text-xs text-zinc-500">📎{mem.attachments.length}</span>
                    )}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-400 text-xs sm:text-sm hidden sm:block">
                    {new Date(selectedMemory.lastModified).toLocaleString()}
                  </span>
                  
                  {/* Attach button */}
                  <button
                    onClick={() => setShowAttachModal(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-purple-400 text-sm flex items-center gap-1"
                  >
                    📎 <span className="hidden sm:inline">Attach</span>
                    {memoryAttachments.length > 0 && (
                      <span className="bg-purple-600 text-white text-xs px-1.5 rounded-full">
                        {memoryAttachments.length}
                      </span>
                    )}
                  </button>
                  
                  {!editing ? (
                    <>
                      <button
                        onClick={() => setEditing(true)}
                        className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-blue-400 text-sm"
                      >
                        Edit
                      </button>
                      {selectedMemory.type !== 'long-term' && (
                        <button
                          onClick={deleteMemory}
                          className="bg-zinc-800 hover:bg-red-900 px-3 py-1.5 rounded-lg text-red-400 text-sm"
                        >
                          Delete
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(false);
                          setEditContent(selectedMemory.content);
                          setMemoryAttachments(selectedMemory.attachments || []);
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
              
              {/* Attachments display */}
              {memoryAttachments.length > 0 && (
                <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="text-xs text-zinc-400 mb-2">Attached Documents:</div>
                  <div className="flex flex-wrap gap-2">
                    {memoryAttachments.map(path => {
                      const doc = documents.find(d => d.path === path);
                      return (
                        <span
                          key={path}
                          className="bg-zinc-700 px-2 py-1 rounded text-sm text-zinc-300 flex items-center gap-1"
                        >
                          📎 {doc?.name || path}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              
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
