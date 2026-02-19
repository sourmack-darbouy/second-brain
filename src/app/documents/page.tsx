'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

interface Document {
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: string;
  isBinary?: boolean;
}

function DocumentsContent() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<{ path: string; content: string; isBase64?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      setShowSidebar(false);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result;
        if (!result) return;
        
        // Determine if binary file
        const isBinary = !file.name.match(/\.(md|txt|json|csv|yaml|yml|js|ts|tsx|jsx|py|html|css|xml)$/i);
        
        let content: string;
        if (isBinary) {
          // Convert to base64
          content = (result as string).split(',')[1]; // Remove data URL prefix
        } else {
          content = result as string;
        }
        
        try {
          const res = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              path: file.name,
              content,
              isBase64: isBinary,
            }),
          });
          
          if (res.ok) {
            fetchDocuments();
          } else {
            alert('Failed to upload document');
          }
        } catch (error) {
          console.error('Upload error:', error);
          alert('Failed to upload file');
        }
        
        setUploading(false);
      };
      
      if (file.name.match(/\.(md|txt|json|csv|yaml|yml|js|ts|tsx|jsx|py|html|css|xml)$/i)) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const downloadDocument = (path: string) => {
    window.open(`/api/documents/${path}?download=true`, '_blank');
  };

  const openInOffice = (path: string) => {
    // Simple download - works everywhere
    window.open(`/api/documents/${path}?download=true`, '_blank');
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, string> = {
      'xlsx': '📊', 'xls': '📊', 'csv': '📊',
      'pptx': '📽️', 'ppt': '📽️',
      'docx': '📝', 'doc': '📝',
      'pdf': '📄',
      'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️',
      'md': '📝', 'txt': '📝',
    };
    return icons[ext] || '📄';
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold">Documents</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="sm:hidden bg-zinc-800 px-3 py-2 rounded-lg font-medium transition"
          >
            📂
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload-docs"
          />
          <label
            htmlFor="file-upload-docs"
            className={`bg-green-600 hover:bg-green-700 px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base cursor-pointer ${uploading ? 'opacity-50' : ''}`}
          >
            {uploading ? 'Uploading...' : '+ Upload'}
          </label>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base"
          >
            {showAddForm ? 'Cancel' : '+ Text'}
          </button>
        </div>
      </div>

      {/* Add Document Form */}
      {showAddForm && (
        <form onSubmit={addDocument} className="bg-zinc-900 rounded-lg p-3 sm:p-6 border border-zinc-800 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Filename</label>
            <input
              type="text"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              placeholder="e.g., project-notes.md"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-zinc-100 placeholder-zinc-500 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              placeholder="Document content..."
              rows={6}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-zinc-100 placeholder-zinc-500 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !newDocName.trim() || !newDocContent.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 px-4 sm:px-6 py-2 rounded-lg font-medium transition w-full sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save Document'}
          </button>
        </form>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Sidebar */}
        <div className={`
          lg:col-span-1 bg-zinc-900 rounded-lg p-3 sm:p-4 border border-zinc-800
          fixed inset-0 z-50 bg-zinc-950/95 lg:bg-transparent lg:static lg:z-auto
          ${showSidebar ? 'block' : 'hidden lg:block'}
        `}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-zinc-300 text-sm sm:text-base">
              All Files ({documents.length})
            </h3>
            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden text-zinc-400 p-2"
            >
              ✕
            </button>
          </div>
          {documents.length === 0 ? (
            <p className="text-zinc-500 text-sm">No documents yet.</p>
          ) : (
            <div className="space-y-1 max-h-[60vh] lg:max-h-[70vh] overflow-auto">
              {documents.map(doc => (
                <button
                  key={doc.path}
                  onClick={() => loadDocument(doc.path)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
                    selectedDoc?.path === doc.path 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{getFileIcon(doc.name)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{doc.name}</div>
                      <div className="text-xs text-zinc-500">{formatSize(doc.size)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 bg-zinc-900 rounded-lg p-3 sm:p-6 border border-zinc-800">
          {selectedDoc ? (
            <div>
              <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                <h3 className="text-lg sm:text-xl font-semibold truncate">{selectedDoc.path}</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selectedDoc.isBase64 && (
                    <button
                      onClick={() => openInOffice(selectedDoc.path)}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-white text-sm"
                    >
                      Download
                    </button>
                  )}
                  <button
                    onClick={() => deleteDocument(selectedDoc.path)}
                    className="text-red-400 hover:text-red-300 text-sm bg-zinc-800 px-3 py-1.5 rounded-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {selectedDoc.isBase64 ? (
                <div className="text-zinc-400 text-center py-8 sm:py-12 bg-zinc-950 rounded-lg border border-zinc-800">
                  <div className="text-4xl mb-3">{getFileIcon(selectedDoc.path)}</div>
                  <p className="mb-2">Binary file - cannot display content</p>
                  <p className="text-sm text-zinc-500">Click "Download" to save, then open locally</p>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-zinc-300 font-mono text-sm bg-zinc-950 p-3 sm:p-4 rounded-lg border border-zinc-800 overflow-auto max-h-[60vh] sm:max-h-[70vh]">
                  {selectedDoc.content || '(empty)'}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-zinc-400 text-center py-8 sm:py-12 text-sm sm:text-base">
              {documents.length === 0 
                ? 'Upload your first document to get started'
                : 'Select a document to view'}
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
