'use client';

import { useEffect, useState } from 'react';

interface Memory {
  name: string;
  path: string;
  content: string;
  lastModified: string;
  type: 'long-term' | 'daily';
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  emailPrimary: string;
  company?: string;
  lastContacted?: string;
}

interface TagStats {
  tag: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

interface ContactMention {
  name: string;
  count: number;
  lastMentioned: string;
}

interface FollowUpSuggestion {
  contact: string;
  lastContacted: string;
  daysSince: number;
  urgency: 'high' | 'medium' | 'low';
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [tagStats, setTagStats] = useState<TagStats[]>([]);
  const [topContacts, setTopContacts] = useState<ContactMention[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpSuggestion[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<{ day: string; count: number }[]>([]);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    
    try {
      const [memRes, contactRes] = await Promise.all([
        fetch('/api/memories'),
        fetch('/api/contacts'),
      ]);
      
      const memData = await memRes.json();
      const contactData = await contactRes.json();
      
      const memories = memData.memories || [];
      const contacts = contactData.contacts || [];
      
      // Analyze tags
      const tagCounts: { [tag: string]: number } = {};
      const tagRegex = /#([a-zA-Z0-9_-]+)/g;
      
      memories.forEach((mem: Memory) => {
        const tags = mem.content.match(tagRegex) || [];
        tags.forEach((tag: string) => {
          const cleanTag = tag.substring(1).toLowerCase();
          tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
        });
      });
      
      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({
          tag,
          count,
          trend: 'stable' as const // Could implement trend analysis
        }));
      
      setTagStats(sortedTags);
      
      // Analyze @mentions
      const mentionCounts: { [name: string]: { count: number; lastMentioned: string } } = {};
      const mentionRegex = /@([A-Z][a-zA-Z]+\s?[A-Z]?[a-zA-Z]*)/g;
      
      memories.forEach((mem: Memory) => {
        const mentions = mem.content.match(mentionRegex) || [];
        mentions.forEach((mention: string) => {
          const cleanName = mention.substring(1);
          if (!mentionCounts[cleanName]) {
            mentionCounts[cleanName] = { count: 0, lastMentioned: mem.lastModified };
          }
          mentionCounts[cleanName].count++;
          if (new Date(mem.lastModified) > new Date(mentionCounts[cleanName].lastMentioned)) {
            mentionCounts[cleanName].lastMentioned = mem.lastModified;
          }
        });
      });
      
      const sortedContacts = Object.entries(mentionCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([name, data]) => ({
          name,
          count: data.count,
          lastMentioned: data.lastMentioned
        }));
      
      setTopContacts(sortedContacts);
      
      // Generate follow-up suggestions
      const now = new Date();
      const suggestions: FollowUpSuggestion[] = [];
      
      contacts.forEach((contact: Contact) => {
        if (contact.lastContacted) {
          const lastContact = new Date(contact.lastContacted);
          const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSince > 30) { // More than 30 days
            suggestions.push({
              contact: `${contact.firstName} ${contact.lastName}`,
              lastContacted: contact.lastContacted,
              daysSince,
              urgency: daysSince > 90 ? 'high' : daysSince > 60 ? 'medium' : 'low'
            });
          }
        }
      });
      
      suggestions.sort((a, b) => b.daysSince - a.daysSince);
      setFollowUps(suggestions.slice(0, 5));
      
      // Weekly activity
      const last7Days: { day: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayMemories = memories.filter((m: Memory) => 
          m.lastModified.startsWith(dateStr)
        );
        
        last7Days.push({
          day: date.toLocaleDateString('en-US', { weekday: 'short' }),
          count: dayMemories.length
        });
      }
      
      setWeeklyActivity(last7Days);
      
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Analyzing your brain...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">AI Insights</h2>
          <p className="text-zinc-400 text-sm mt-1">Smart analysis of your knowledge base</p>
        </div>
        <button
          onClick={fetchInsights}
          className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-sm flex items-center gap-1"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Weekly Activity */}
      <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span> Last 7 Days Activity
        </h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {weeklyActivity.map((day, i) => {
            const maxCount = Math.max(...weeklyActivity.map(d => d.count), 1);
            const height = (day.count / maxCount) * 100;
            
            return (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full bg-blue-600 rounded-t transition-all"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`${day.count} memories`}
                  />
                </div>
                <span className="text-xs text-zinc-400 mt-2">{day.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tags */}
        <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🏷️</span> Top Tags
          </h3>
          <div className="space-y-2">
            {tagStats.map((stat, i) => (
              <div key={stat.tag} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm w-6">#{i + 1}</span>
                  <span className="font-medium">#{stat.tag}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(stat.count / tagStats[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-zinc-400 w-8 text-right">{stat.count}</span>
                </div>
              </div>
            ))}
            {tagStats.length === 0 && (
              <p className="text-zinc-500 text-sm">No tags found. Start adding #tags to your memories!</p>
            )}
          </div>
        </div>

        {/* Most Mentioned Contacts */}
        <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>👥</span> Most Mentioned Contacts
          </h3>
          <div className="space-y-3">
            {topContacts.map((contact, i) => (
              <div key={contact.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm w-6">#{i + 1}</span>
                  <span className="font-medium">@{contact.name}</span>
                </div>
                <div className="text-sm text-zinc-400">
                  {contact.count} mentions
                </div>
              </div>
            ))}
            {topContacts.length === 0 && (
              <p className="text-zinc-500 text-sm">No @mentions found. Use @Name to mention contacts!</p>
            )}
          </div>
        </div>
      </div>

      {/* Follow-Up Suggestions */}
      {followUps.length > 0 && (
        <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>⏰</span> Follow-Up Suggestions
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Contacts you haven't reached out to in a while
          </p>
          <div className="space-y-2">
            {followUps.map((suggestion, i) => (
              <div key={i} className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{suggestion.contact}</p>
                  <p className="text-xs text-zinc-500">
                    Last contacted: {new Date(suggestion.lastContacted).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    suggestion.urgency === 'high' 
                      ? 'bg-red-600/30 text-red-400'
                      : suggestion.urgency === 'medium'
                        ? 'bg-yellow-600/30 text-yellow-400'
                        : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {suggestion.daysSince} days ago
                  </span>
                  <a
                    href="/contacts"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>💡</span> Quick Stats
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">{tagStats.length}</div>
            <div className="text-sm text-zinc-400">Unique Tags</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400">{topContacts.length}</div>
            <div className="text-sm text-zinc-400">Active Contacts</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">{weeklyActivity.reduce((sum, d) => sum + d.count, 0)}</div>
            <div className="text-sm text-zinc-400">Memories This Week</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-400">{followUps.length}</div>
            <div className="text-sm text-zinc-400">Need Follow-Up</div>
          </div>
        </div>
      </div>
    </div>
  );
}
