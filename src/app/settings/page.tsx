'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (type: 'memories' | 'contacts' | 'tasks' | 'backup') => {
    setExporting(type);
    
    try {
      const response = await fetch(`/api/export/${type}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || `second-brain-${type}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Settings</h2>
          <p className="text-zinc-400 text-sm mt-1">Export, backup, and manage your data</p>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>💾</span> Export Data
        </h3>
        <p className="text-zinc-400 text-sm mb-6">
          Download your data in various formats. Keep your exports safe as backups.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Memories Export */}
          <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium">Memories</h4>
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-sm text-zinc-400 mb-3">
              All your notes and memories as Markdown
            </p>
            <button
              onClick={() => handleExport('memories')}
              disabled={exporting !== null}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition text-sm"
            >
              {exporting === 'memories' ? 'Exporting...' : 'Export as Markdown'}
            </button>
          </div>

          {/* Contacts Export */}
          <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium">Contacts</h4>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-sm text-zinc-400 mb-3">
              All contacts as CSV (Excel-compatible)
            </p>
            <button
              onClick={() => handleExport('contacts')}
              disabled={exporting !== null}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition text-sm"
            >
              {exporting === 'contacts' ? 'Exporting...' : 'Export as CSV'}
            </button>
          </div>

          {/* Tasks Export */}
          <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium">Tasks</h4>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-sm text-zinc-400 mb-3">
              All tasks with priorities and due dates
            </p>
            <button
              onClick={() => handleExport('tasks')}
              disabled={exporting !== null}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition text-sm"
            >
              {exporting === 'tasks' ? 'Exporting...' : 'Export as JSON'}
            </button>
          </div>

          {/* Full Backup */}
          <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium">Full Backup</h4>
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-sm text-zinc-400 mb-3">
              Everything: memories, contacts, tasks, documents
            </p>
            <button
              onClick={() => handleExport('backup')}
              disabled={exporting !== null}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition text-sm"
            >
              {exporting === 'backup' ? 'Creating Backup...' : 'Create Full Backup'}
            </button>
          </div>
        </div>
      </div>

      {/* Backup Tips */}
      <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>💡</span> Backup Tips
        </h3>
        <div className="space-y-3 text-sm text-zinc-300">
          <div className="flex gap-3">
            <span className="text-blue-400">1.</span>
            <p><strong>Regular Backups:</strong> Create a full backup weekly or monthly</p>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-400">2.</span>
            <p><strong>Cloud Storage:</strong> Save backups to Google Drive, iCloud, or Dropbox</p>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-400">3.</span>
            <p><strong>Multiple Copies:</strong> Keep 3 copies in different locations</p>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-400">4.</span>
            <p><strong>Before Changes:</strong> Always backup before major updates</p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span> Data Management
        </h3>
        <div className="space-y-3">
          <div className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="font-medium">Storage Location</p>
              <p className="text-xs text-zinc-400">Your data is stored securely in Upstash Redis</p>
            </div>
            <span className="text-zinc-600">🔐</span>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="font-medium">Automatic Backups</p>
              <p className="text-xs text-zinc-400">Not yet implemented (coming soon)</p>
            </div>
            <span className="text-zinc-600">⏳</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-900/20 rounded-lg p-4 sm:p-6 border border-red-500/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-400">
          <span>⚠️</span> Danger Zone
        </h3>
        <p className="text-sm text-zinc-400 mb-4">
          These actions are irreversible. Make sure you have a backup first.
        </p>
        <button
          disabled
          className="bg-red-600/50 text-red-300 px-4 py-2 rounded-lg font-medium text-sm cursor-not-allowed"
        >
          Delete All Data (Not Implemented)
        </button>
      </div>
    </div>
  );
}
