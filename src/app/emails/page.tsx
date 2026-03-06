'use client';

import { useEffect, useState } from 'react';

interface Email {
  id: string;
  from: string;
  fromEmail: string;
  to: string[];
  subject: string;
  snippet: string;
  body: string;
  date: string;
  timestamp: number;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  useEffect(() => {
    fetchEmails();
  }, [search]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const url = search 
        ? `/api/emails?search=${encodeURIComponent(search)}`
        : '/api/emails';
      
      const res = await fetch(url);
      const data = await res.json();
      
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const createMemoryFromEmail = async (email: Email) => {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Format as memory
    const memoryContent = `## Email from ${email.from}

**From:** ${email.fromEmail}  
**Subject:** ${email.subject}  
**Date:** ${email.date}  

### Body

${email.body}

---
*Imported from email on ${timestamp}*
`;
    
    try {
      // Check if today's memory exists
      const res = await fetch('/api/memories');
      const data = await res.json();
      const todayMemory = data.memories?.find((m: any) => m.path === `memory/${today}.md`);
      
      if (todayMemory) {
        // Append to existing
        const updatedContent = todayMemory.content + '\n\n' + memoryContent;
        await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: `memory/${today}.md`,
            content: updatedContent,
            type: 'daily',
          }),
        });
      } else {
        // Create new
        const newContent = `# ${today}\n\n${memoryContent}`;
        await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: `memory/${today}.md`,
            content: newContent,
            type: 'daily',
          }),
        });
      }
      
      alert('Email added to today\'s memory!');
    } catch (error) {
      console.error('Failed to create memory:', error);
      alert('Failed to create memory. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading emails...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Emails</h2>
          <p className="text-zinc-400 text-sm mt-1">{emails.length} emails stored</p>
        </div>
        
        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
          </div>
        </div>
      </div>

      {/* Email List */}
      {emails.length === 0 ? (
        <div className="bg-zinc-900 rounded-lg p-6 sm:p-8 border border-zinc-800 text-center">
          <div className="text-4xl mb-3">📧</div>
          <p className="text-zinc-400">No emails stored yet</p>
          <p className="text-zinc-500 text-sm mt-1">
            Emails will appear here when processed by the email assistant
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {emails.map(email => (
            <div
              key={email.id}
              className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
              onClick={() => setSelectedEmail(selectedEmail?.id === email.id ? null : email)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-400 text-sm">{formatDate(email.date)}</span>
                  </div>
                  <h3 className="font-medium text-base truncate mb-1">
                    {email.subject}
                  </h3>
                  <p className="text-sm text-zinc-400 mb-2">
                    From: {email.from} ({email.fromEmail})
                  </p>
                  <p className="text-sm text-zinc-500 line-clamp-2">
                    {email.snippet}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createMemoryFromEmail(email);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap"
                  >
                    📝 Create Memory
                  </button>
                </div>
              </div>
              
              {/* Expanded view */}
              {selectedEmail?.id === email.id && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans">
                    {email.body}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
