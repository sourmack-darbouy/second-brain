'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QuickAddPage() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [quickMode, setQuickMode] = useState<'note' | 'task' | 'idea' | 'contact'>('note');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Load recent tags from localStorage
  useEffect(() => {
    const recentTags = localStorage.getItem('recentTags');
    if (recentTags) {
      setTags(JSON.parse(recentTags).slice(0, 5));
    }
  }, []);

  // Quick templates
  const templates = {
    note: {
      prefix: '',
      suffix: '',
      placeholder: 'Quick note...',
    },
    task: {
      prefix: '- [ ] ',
      suffix: '',
      placeholder: 'Task to do...',
    },
    idea: {
      prefix: '💡 **Idea:** ',
      suffix: '',
      placeholder: 'Your idea...',
    },
    contact: {
      prefix: '📞 ',
      suffix: '',
      placeholder: 'Name - Company - Notes...',
    },
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    setSaving(true);

    const template = templates[quickMode];
    const formattedContent = template.prefix + content.trim() + template.suffix;
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Add tags
    const tagString = tags.map(t => `#${t}`).join(' ');
    const finalContent = `${formattedContent} ${tagString} _(${timestamp})_`;

    // Check if today's memory exists
    const memoriesRes = await fetch('/api/memories');
    const memoriesData = await memoriesRes.json();
    const todayMemory = memoriesData.memories?.find((m: any) => m.path === `memory/${today}.md`);

    if (todayMemory) {
      // Append to existing
      const updatedContent = todayMemory.content + '\n\n' + finalContent;
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
      const newContent = `# ${today}\n\n## Quick Captures\n\n${finalContent}\n`;
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

    // Save recent tags
    if (tags.length > 0) {
      const recentTags = [...new Set([...tags, ...JSON.parse(localStorage.getItem('recentTags') || '[]')])].slice(0, 10);
      localStorage.setItem('recentTags', JSON.stringify(recentTags));
    }

    setSaving(false);
    setSaved(true);
    setContent('');
    setTags([]);

    // Reset after 2 seconds
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // Common quick tags
  const quickTags = ['meeting', 'call', 'follow-up', 'idea', 'urgent', 'work', 'personal'];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4 safe-area-top">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">⚡ Quick Add</h1>
          <button
            onClick={() => router.push('/memories')}
            className="text-zinc-400 hover:text-white text-sm"
          >
            Full View →
          </button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="bg-zinc-900/50 p-4 border-b border-zinc-800">
        <div className="grid grid-cols-4 gap-2">
          {(['note', 'task', 'idea', 'contact'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setQuickMode(mode)}
              className={`py-3 rounded-lg font-medium transition ${
                quickMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {mode === 'note' && '📝'}
              {mode === 'task' && '✅'}
              {mode === 'idea' && '💡'}
              {mode === 'contact' && '👤'}
              <span className="block text-xs mt-1 capitalize">{mode}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Input */}
      <div className="flex-1 p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={templates[quickMode].placeholder}
          className="w-full h-40 bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-blue-500"
          autoFocus
        />

        {/* Tags */}
        <div className="mt-4">
          <div className="text-xs text-zinc-400 mb-2">Tags</div>
          
          {/* Selected Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="bg-blue-600/30 text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-white">×</button>
                </span>
              ))}
            </div>
          )}

          {/* Quick Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {quickTags.filter(t => !tags.includes(t)).map(tag => (
              <button
                key={tag}
                onClick={() => addTag(tag)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1 rounded-full text-sm"
              >
                + #{tag}
              </button>
            ))}
          </div>

          {/* Custom Tag Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput) {
                  e.preventDefault();
                  addTag(tagInput.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                }
              }}
              placeholder="Add tag..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={() => tagInput && addTag(tagInput.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="bg-zinc-700 hover:bg-zinc-600 px-4 rounded-lg"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800 safe-area-bottom">
        <button
          onClick={handleSave}
          disabled={!content.trim() || saving}
          className={`w-full py-4 rounded-lg font-semibold text-lg transition ${
            saved
              ? 'bg-green-600 text-white'
              : saving
                ? 'bg-zinc-700 text-zinc-400'
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save to Memory'}
        </button>
        
        <p className="text-center text-xs text-zinc-500 mt-2">
          Adds to {today}'s memory
        </p>
      </div>

      {/* PWA Install Hint */}
      <div className="px-4 pb-4">
        <div className="bg-zinc-900 rounded-lg p-3 text-center">
          <p className="text-xs text-zinc-400">
            💡 Add to Home Screen for quick access!
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Share → Add to Home Screen
          </p>
        </div>
      </div>
    </div>
  );
}
