'use client';

import { useEffect, useState } from 'next/navigation';

import Link from 'next/link';

interface DashboardStats {
  totalMemories: number;
  totalCompanies: number;
  activeDays: number;
  recentMemories: { date: string; title: string; tags: string[] }[];
  topTags: { name: string; count: number }[];
  topCompanies: { name: string; count: number }[];
  recentActivity: { date: string; count: number }[];
  actionItems: { total: number; pending: number; high: number }[];
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalMemories: 0,
    totalCompanies: 0,
    activeDays: 0,
    recentMemories: [],
    topTags: [],
    topCompanies: [],
    recentActivity: [],
    actionItems: { total: 0, pending: 0, high: 0 },
  });
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [showSearch, setShowSearch] = useState(false);

  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats in parallel
      const [memoriesRes, companiesRes] contactsRes] = await Promise.all([
        fetch('/api/memories').then(r => r.json()),
        fetch('/api/companies').then(r => r.json()),
        fetch('/api/contacts').then(r => r.json()),
      ]);

      const memoriesData = await memoriesRes.json();
      const companiesData = await companiesRes.json();
      const contactsData = await contactsRes.json();

      // Calculate stats
      const totalMemories = (memoriesData.memories || []).length;
      
      // Get recent memories (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentMemories = (memoriesData.memories || [])
        .filter(m => m.lastModified >= weekAgo.toISOString().split('T')[0])
        .slice(0, 5)
        .map(m => ({
          date: m.lastModified.split('T')[0],
          title: m.name,
          tags: extractTags(m.content || ''),
        }));

      
      // Get top tags
      const tagCounts = new Map<string, number>();
      const tagRegex = /#([a-zA-Z0-9_-]+)/g;
      memoriesData.memories.forEach(mem => {
        if (mem.content) {
          let match;
          while ((match = tagRegex.exec(mem.content)) !== null) {
            const tag = match[1].toLowerCase();
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        }
      });
      
      const topTags = Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Get top companies
      const companyCounts = new Map<string, number>();
      const companyRegex = /\[\[([^\]]+)\]\]/g;
      memoriesData.memories.forEach(mem => {
        if (mem.content) {
          let match;
          while ((match = companyRegex.exec(mem.content)) !== null) {
            const company = match[1];
            companyCounts.set(company, (companyCounts.get(company) || 0) + 1);
          }
        }
      });
      
      const topCompanies = Array.from(companyCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      
      // Get activity by date (last 14 days)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const activityByDate = new Map<string, number>();
      memoriesData.memories.forEach(mem => {
        const date = mem.lastModified.split('T')[0];
        activityByDate.set(date, (activityByDate.get(date) || 0) + 1);
      });
      
      const recentActivity = Array.from(activityByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7);
      
      // Extract action items
      const actionRegex = /[-*]?\s*\[\s*\]\s*(.+)/g;
      const allActions: { text: string; memory: string }[] = [];
      
      memoriesData.memories.forEach(mem => {
        if (mem.content) {
          let match;
          while ((match = actionRegex.exec(mem.content)) !== null) {
            allActions.push({
              text: match[1].trim(),
              memory: mem.name,
              date: mem.lastModified.split('T')[0],
            });
          }
        }
      });
      
      // Sort by priority
      allActions.sort((a, b) => {
        if (a.text.toLowerCase().includes('urgent') || a.text.includes('!!!')) return 2;
        if (a.text.toLowerCase().includes('important') || a.text.includes('follow')) return 1;
        return 0;
      });
      
      const pendingActions = allActions.filter(a => a.priority === 0).length;
      const highActions = allActions.filter(a => a.priority === 2).length;

      setStats({
        totalMemories,
        totalCompanies: companiesData.totalCompanies || 0,
        activeDays: recentMemories.length,
        recentMemories,
        topTags
 topTags.slice(0, 10),
        topCompanies: topCompanies.slice(0, 10),
        recentActivity
        actionItems: {
          total: allActions.length,
          pending: pendingActions.length,
          high: highActions.length,
        },
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError('Failed to load dashboard')
      setLoading(false)
    }
  }

  const extractTags = (content: string): string[] => {
    const tags: string[] = []
    const regex = /#([a-zA-Z0-9_-]+)/g
    let match
    while ((match = regex.exec(content)) !== null) {
      tags.push(match[1].toLowerCase())
    }
    return [...new Set(tags)]
  }

  
  const extractCompanies = (content: string): string[] => {
    const companies: string[] = []
    const regex = /\[\[([^\]]+)\]\]/g
    let match
    while ((match = regex.exec(content)) !== null) {
      companies.push(match[1])
    }
    return [...new Set(companies)]
  }

  
  const handleQuickAdd = async (data: { type: string; content: string }) => {
    try {
      const res = await fetch('/api/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (res.ok) {
        fetchDashboard()
        setShowQuickAdd(false)
      }
    } catch (err) {
      console.error('Quick add failed:', err)
    }
  }
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffMins = Math.round(diffMs / 60000)
    
    if (diffMins < 0) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 24 * 60) return `${Math.round(diffMins / 60)}h ago`
    
    const days = Math.floor(diffMins / 1440)
    return `${days}+ days ago`
    
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  
  const openMemory = (date: string) => {
    router.push(`/memories?file=${encodeURIComponent(`memory/${date}.md`)}`)
  }
  
  const openCompany = (company: string) => {
    router.push(`/companies?search=${encodeURIComponent(company)}`)
  }
  
  if (loading) {
    return (
      <div className="p-6">
        <div className="text-zinc-400">Loading dashboard...</div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/50 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => router.push('/memories')} 
          className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-blue-400">{stats.totalMemories}</div>
            <span className="text-2xl">📝</span>
          </div>
          <div className="text-sm text-zinc-400">Memories</div>
        </div>
        
        <div 
          onClick={() => router.push('/companies')} 
          className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-green-400">{stats.totalCompanies}</div>
            <span className="text-2xl">🏢</span>
          </div>
          <div className="text-sm text-zinc-400">Companies</div>
        </div>
        
        <div 
          onClick={() => router.push('/contacts')} 
          className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-purple-400">{contacts.length}</div>
            <span className="text-2xl">👥</span>
          </div>
          <div className="text-sm text-zinc-400">Contacts</div>
        </div>
        
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-amber-400">{stats.activeDays}</div>
            <span className="text-2xl">📅</span>
          </div>
          <div className="text-sm text-zinc-400">Active Days (7d)</div>
        </div>
        
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-red-400">{stats.actionItems.high}</div>
            <span className="text-2xl">⚡</span>
          </div>
          <div className="text-sm text-zinc-400">High Priority Actions</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
        <h3 className="font-semibold text-zinc-300 mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {stats.recentActivity.slice(0, 5).map(activity => (
            <div key={activity.date} className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">{formatDate(activity.date)}</span>
              <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                {activity.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Add */}
      <button
        onClick={() => setShowQuickAdd(true)}
        className="fixed bottom-20 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg flex items-center justify-center text-xl z-40 sm:hidden"
      >
        ⚡
      </button>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full border border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Quick Add</h3>
              <button onClick={() => setShowQuickAdd(false)} className="text-zinc-400 hover:text-white text-xl">✕</button>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => { setShowQuickAdd(false); router.push('/memories?new=true'); }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
              >
                📝 New Memory
              </button>
              <button
                onClick={() => { setShowQuickAdd(false); router.push('/contacts?action=new'); }}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg"
              >
                👤 New Contact
              </button>
              <button
                onClick={() => { setShowQuickAdd(false); router.push('/tasks?action=new'); }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg"
              >
                ✅ New Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
