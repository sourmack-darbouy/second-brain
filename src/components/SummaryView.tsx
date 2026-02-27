'use client';

import { useState, useEffect } from 'react';
import { generateWeeklySummary, formatSummaryMarkdown, WeeklySummary } from '@/lib/summary-generator';

interface SummaryViewProps {
  memories: { name: string; path: string; content: string; lastModified: string }[];
  onClose: () => void;
  onSaveAsMemory: (content: string) => void;
}

export default function SummaryView({ memories, onClose, onSaveAsMemory }: SummaryViewProps) {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [viewMode, setViewMode] = useState<'cards' | 'markdown'>('cards');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // Generate summary based on period
    const now = new Date();
    let filteredMemories = memories;
    
    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filteredMemories = memories.filter(m => new Date(m.lastModified) >= weekAgo);
    } else {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filteredMemories = memories.filter(m => new Date(m.lastModified) >= monthAgo);
    }
    
    const generated = generateWeeklySummary(filteredMemories);
    setSummary(generated);
    setLoading(false);
  }, [memories, period]);

  const handleSaveAsMemory = () => {
    if (!summary) return;
    const markdown = formatSummaryMarkdown(summary, period === 'week' ? 'Weekly Summary' : 'Monthly Summary');
    onSaveAsMemory(markdown);
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-lg p-6 text-center">
          <div className="animate-spin text-4xl mb-4">📊</div>
          <p className="text-zinc-400">Generating summary...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full">
          <p className="text-zinc-400 text-center">No memories found for this period.</p>
          <button onClick={onClose} className="mt-4 w-full bg-zinc-700 py-2 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-zinc-900 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto border border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            📊 {period === 'week' ? 'Weekly' : 'Monthly'} Summary
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <button
              onClick={() => setViewMode(viewMode === 'cards' ? 'markdown' : 'cards')}
              className="bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-lg text-sm"
            >
              {viewMode === 'cards' ? '📝 Markdown' : '📊 Cards'}
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-2">✕</button>
          </div>
        </div>

        {/* Period info */}
        <p className="text-sm text-zinc-400 mb-6">
          {summary.period.start} to {summary.period.end}
        </p>

        {viewMode === 'cards' ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-zinc-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">{summary.totalMemories}</div>
                <div className="text-xs text-zinc-400">Memories</div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{summary.totalWords}</div>
                <div className="text-xs text-zinc-400">Words</div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{summary.actionItems.total}</div>
                <div className="text-xs text-zinc-400">Actions</div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-400">{summary.meetings.length}</div>
                <div className="text-xs text-zinc-400">Meetings</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Contacts */}
              {summary.topContacts.length > 0 && (
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    👥 Top Contacts
                  </h4>
                  <div className="space-y-2">
                    {summary.topContacts.map((contact, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-blue-400">@{contact.name}</span>
                        <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded">{contact.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Tags */}
              {summary.topTags.length > 0 && (
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    🏷️ Top Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {summary.topTags.map((tag, i) => (
                      <span key={i} className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-sm">
                        #{tag.name} <span className="text-xs opacity-70">({tag.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Companies */}
              {summary.topCompanies.length > 0 && (
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    🏢 Companies
                  </h4>
                  <div className="space-y-2">
                    {summary.topCompanies.map((company, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span>{company.name}</span>
                        <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded">{company.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meetings */}
              {summary.meetings.length > 0 && (
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    📅 Meetings & Calls
                  </h4>
                  <div className="space-y-2">
                    {summary.meetings.slice(0, 5).map((meeting, i) => (
                      <div key={i} className="text-sm">
                        <div className="text-zinc-300">{meeting.date}</div>
                        <div className="text-xs text-zinc-400">
                          {meeting.contacts.length > 0 ? meeting.contacts.join(', ') : meeting.summary.substring(0, 50)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Deals */}
            {summary.deals.length > 0 && (
              <div className="mt-6 bg-zinc-800 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  💼 Deals & Opportunities
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {summary.deals.slice(0, 6).map((deal, i) => {
                    const statusColor = deal.status === 'Won' ? 'bg-green-600' : deal.status === 'Lost' ? 'bg-red-600' : 'bg-yellow-600';
                    return (
                      <div key={i} className="bg-zinc-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{deal.company}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${statusColor}`}>{deal.status}</span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">{deal.notes}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending Actions */}
            {summary.actionItems.pending.length > 0 && (
              <div className="mt-6 bg-zinc-800 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  ✅ Pending Action Items ({summary.actionItems.pending.length})
                </h4>
                <div className="space-y-2">
                  {summary.actionItems.pending.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1 rounded border-zinc-600" />
                      <div className="flex-1">
                        <span className="text-zinc-300">{item.text}</span>
                        <span className="text-xs text-zinc-500 ml-2">({item.memory})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Markdown View */
          <div className="bg-zinc-800 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-mono">
              {formatSummaryMarkdown(summary, period === 'week' ? 'Weekly Summary' : 'Monthly Summary')}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-700">
          <button
            onClick={handleSaveAsMemory}
            className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-medium"
          >
            💾 Save as Memory
          </button>
          <button
            onClick={() => {
              const text = formatSummaryMarkdown(summary, period === 'week' ? 'Weekly Summary' : 'Monthly Summary');
              navigator.clipboard.writeText(text);
            }}
            className="bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded-lg"
          >
            📋 Copy
          </button>
          <button onClick={onClose} className="bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
