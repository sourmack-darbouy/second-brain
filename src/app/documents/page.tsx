'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Document {
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: string;
}

function DocumentsContent() {
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<{ path: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    
    // Check if a specific file was requested
    const filePath = searchParams.get('file');
    if (filePath) {
      loadDocument(filePath);
    }
  }, [searchParams]);

  const loadDocument = async (path: string) => {
    try {
      const res = await fetch(`/api/documents/${path}`);
      const data = await res.json();
      setSelectedDoc(data);
    } catch (error) {
      console.error('Failed to load document:', error);
    }
  };

  const addDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocContent.trim()) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDocName.trim(),
          path: newDocName.trim(),
          content: newDocContent.trim(),
        }),
      });
      
      if (res.ok) {
        setNewDocName('');
        setNewDocContent('');
        setShowAddForm(false);
        fetchDocuments();
      }
    } catch (error) {
      console.error('Failed to add document:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = async (path: string) => {
    if (!confirm('Delete this document?')) return;
    
    try {
      await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      
      setSelectedDoc(null);
      fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return <div className="text-zinc-400">Loading documents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Documents</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium transition"
        >
          {showAddForm ? 'Cancel' : '+ Add Document'}
        </button>
      </div>

      {/* Add Document Form */}
      {showAddForm && (
        <form onSubmit={addDocument} className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Filename</label>
            <input
              type="text"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              placeholder="e.g., project-notes.md"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-zinc-100 placeholder-zinc-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              placeholder="Document content..."
              rows={8}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-zinc-100 placeholder-zinc-500 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !newDocName.trim() || !newDocContent.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 px-6 py-2 rounded font-medium transition"
          >
            {saving ? 'Saving...' : 'Save Document'}
          </button>
        </form>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 bg-zinc-900 rounded-lg p-4 border border-zinc-800 max-h-[80vh] overflow-auto">
          <h3 className="font-semibold mb-3 text-zinc-300">
            All Files ({documents.length})
          </h3>
          {documents.length === 0 ? (
            <p className="text-zinc-500 text-sm">No documents yet. Add one to get started.</p>
          ) : (
            <div className="space-y-1">
              {documents.map(doc => (
                <button
                  key={doc.path}
                  onClick={() => loadDocument(doc.path)}
                  className={`w-full text-left px-3 py-2 rounded transition text-sm ${
                    selectedDoc?.path === doc.path 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{doc.name}</span>
                    <span className="text-zinc-500 text-xs">{formatSize(doc.size)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 bg-zinc-900 rounded-lg p-6 border border-zinc-800">
          {selectedDoc ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{selectedDoc.path}</h3>
                <button
                  onClick={() => deleteDocument(selectedDoc.path)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Delete
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-zinc-300 font-mono text-sm bg-zinc-950 p-4 rounded border border-zinc-800 overflow-auto max-h-[70vh]">
                {selectedDoc.content || '(empty)'}
              </pre>
            </div>
          ) : (
            <div className="text-zinc-400 text-center py-12">
              {documents.length === 0 
                ? 'Add your first document to get started'
                : 'Select a document to view its contents'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400">Loading documents...</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
