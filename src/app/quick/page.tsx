'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function QuickAddPage() {
  const router = useRouter();
  const [type, setType] = useState<'memory' | 'contact' | 'task'>('memory');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [type]);

  const handleSave = async () => {
    if (!content.trim() || saving) return;

    setSaving(true);

    try {
      if (type === 'memory') {
        // Create today's memory note
        const today = new Date().toISOString().split('T')[0];
        
        // First check if today's memory exists
        const checkRes = await fetch('/api/memories');
        const memoriesData = await checkRes.json();
        const existing = memoriesData.memories?.find((m: any) => m.path === `memory/${today}.md`);
        
        if (existing) {
          // Append to existing memory
          const contentRes = await fetch(`/api/memories/content?path=memory/${today}.md`);
          const existingData = await contentRes.json();
          const updatedContent = existingData.content + '\n\n' + content;
          
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
          // Create new memory
          const template = `# ${today}

## Quick Notes

${content}
`;
          await fetch('/api/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: `memory/${today}.md`,
              content: template,
              type: 'daily',
            }),
          });
        }
      } else if (type === 'task') {
        // Create task
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: content,
            priority: 'medium',
            status: 'pending',
          }),
        });
      } else if (type === 'contact') {
        // Parse contact (simple format: "Name, Company, email")
        const parts = content.split(',').map(s => s.trim());
        await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: parts[0]?.split(' ')[0] || '',
            lastName: parts[0]?.split(' ').slice(1).join(' ') || '',
            company: parts[1] || '',
            emailPrimary: parts[2] || '',
          }),
        });
      }

      // Vibrate on success
      if ('vibrate' in navigator) {
        navigator.vibrate([20, 50, 20]);
      }

      // Go back
      router.back();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const placeholder = {
    memory: 'What\'s on your mind?\n\nUse @Name to mention contacts\nUse #tags to organize\nUse [[Company]] for companies',
    task: 'Enter task...\n\nAdd details on next lines',
    contact: 'Name, Company, email\n\nExample: John Smith, Acme Corp, john@acme.com',
  };

  const icon = {
    memory: '📝',
    task: '✅',
    contact: '👤',
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <button
          onClick={() => router.back()}
          className="text-zinc-400 active:text-white p-2 -ml-2"
        >
          ✕
        </button>
        <h1 className="text-lg font-semibold">Quick Add</h1>
        <button
          onClick={handleSave}
          disabled={!content.trim() || saving}
          className="bg-blue-600 active:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 px-4 py-1.5 rounded-lg font-medium text-sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Type Selector */}
      <div className="flex gap-2 p-4 border-b border-zinc-800">
        {(['memory', 'task', 'contact'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setType(t); setContent(''); }}
            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all active:scale-95 ${
              type === t
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 active:bg-zinc-700'
            }`}
          >
            <span className="mr-1">{icon[t]}</span>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content Input */}
      <div className="flex-1 p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder[type]}
          className="w-full h-full bg-transparent text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none text-base leading-relaxed"
          style={{ minHeight: '50vh' }}
        />
      </div>

      {/* Quick Templates (for memories) */}
      {type === 'memory' && (
        <div className="p-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">Quick insert:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Meeting', insert: '## Meeting\n\n**Company:** [[]]\n**Attendees:** @\n**Notes:**\n- ' },
              { label: 'Call', insert: '## Call with [[]]\n\n- Discussed: \n- Next: ' },
              { label: 'Follow-up', insert: '- [ ] Follow up with [[]] #follow-up\n  - By: ' },
              { label: 'Action', insert: '- [ ] ' },
              { label: '#tag', insert: '#' },
            ].map(template => (
              <button
                key={template.label}
                onClick={() => setContent(prev => prev + template.insert)}
                className="bg-zinc-800 active:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg text-sm"
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      <div className="p-4 text-center text-xs text-zinc-600">
        Tip: Use voice input on your keyboard for faster entry
      </div>
    </div>
  );
}
