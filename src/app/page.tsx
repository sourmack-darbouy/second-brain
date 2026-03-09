'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  totalMemories: number;
  totalCompanies: number;
  totalContacts: number;
  activeDays: number;
  topTags: { name: string; count: number }[];
  topCompanies: { name: string; count: number }[];
  recentActivity: { date: string; count: number }[];
}

const TAG_COLORS: Record<string, string> = {
  'tender': 'bg-orange-600',
  'partner': 'bg-blue-600',
  'hot-lead': 'bg-red-600',
  'poc': 'bg-violet-600',
  'mining': 'bg-stone-600',
  'utilities': 'bg-emerald-600',
  'lorawan': 'bg-cyan-600',
  'tracking': 'bg-sky-600',
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalMemories: 0,
    totalCompanies: 0,
    totalContacts: 0,
    activeDays: 0,
    topTags: [],
    topCompanies: [],
    recentActivity: [],
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const [memoriesRes, companiesRes, contactsRes] = await Promise.all([
        fetch('/api/memories'),
        fetch('/api/companies'),
        fetch('/api/contacts'),
      ]);

      const memoriesData = await memoriesRes.json();
      const companiesData = await companiesRes.json();
      const contactsData = await contactsRes.json();

      const totalMemories = (memoriesData.memories || []).length;
      const totalCompanies = (companiesData.companies || []).length;
      const totalContacts = (contactsData.contacts || []).length;

      // Calculate active days (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentMemories = (memoriesData.memories || []).filter(
        (m: any) => m.lastModified >= weekAgo.toISOString().split('T')[0]
      );
      const activeDays = new Set(recentMemories.map((m: any) => m.lastModified.split('T')[0])).size;

      // Get recent activity (last 14 days)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const activityByDate = new Map<string, number>();
      (memoriesData.memories || []).forEach((m: any) => {
        const date = m.lastModified?.split('T')[0];
        if (date && date >= twoWeeksAgo.toISOString().split('T')[0]) {
          activityByDate.set(date, (activityByDate.get(date) || 0) + 1);
        }
      });
      const recentActivity = Array.from(activityByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7);

      // Top tags from companies data
      const topTags = (companiesData.stats?.topTags || []).slice(0, 10);

      // Top companies
      const topCompanies = (companiesData.companies || [])
        .slice(0, 10)
        .map((c: any) => ({ name: c.name, count: c.meetingCount }));

      setStats({
        totalMemories,
        totalCompanies,
        totalContacts,
        activeDays,
        topTags,
        topCompanies,
        recentActivity,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Your Second Brain at a glance</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => router.push('/memories')}
          className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-blue-400">{stats.totalMemories}</div>
            <span className="text-2xl">📝</span>
          </div>
          <div className="text-sm text-zinc-400">Memories</div>
        </button>

        <button
          onClick={() => router.push('/companies')}
          className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-green-400">{stats.totalCompanies}</div>
            <span className="text-2xl">🏢</span>
          </div>
          <div className="text-sm text-zinc-400">Companies</div>
        </button>

        <button
          onClick={() => router.push('/contacts')}
          className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-purple-400">{stats.totalContacts}</div>
            <span className="text-2xl">👥</span>
          </div>
          <div className="text-sm text-zinc-400">Contacts</div>
        </button>

        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-3xl font-bold text-amber-400">{stats.activeDays}</div>
            <span className="text-2xl">📅</span>
          </div>
          <div className="text-sm text-zinc-400">Active Days (7d)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          {stats.recentActivity.length === 0 ? (
            <p className="text-zinc-500 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {stats.recentActivity.map((activity) => (
                <div key={activity.date} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <span className="text-zinc-300">{formatDate(activity.date)}</span>
                  <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full text-sm">
                    {activity.count} {activity.count === 1 ? 'memory' : 'memories'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Tags */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <h3 className="font-semibold mb-4">Top Tags</h3>
          {stats.topTags.length === 0 ? (
            <p className="text-zinc-500 text-sm">No tags found</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.topTags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => router.push(`/memories?tag=${tag.name}`)}
                  className={`text-sm px-3 py-1 rounded ${TAG_COLORS[tag.name] || 'bg-zinc-700'} text-white hover:opacity-80`}
                >
                  #{tag.name} ({tag.count})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top Companies */}
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Top Companies</h3>
            <button
              onClick={() => router.push('/companies')}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View all →
            </button>
          </div>
          {stats.topCompanies.length === 0 ? (
            <p className="text-zinc-500 text-sm">No companies found</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {stats.topCompanies.map((company) => (
                <button
                  key={company.name}
                  onClick={() => router.push(`/companies?search=${encodeURIComponent(company.name)}`)}
                  className="bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 text-left transition"
                >
                  <div className="font-medium truncate">{company.name}</div>
                  <div className="text-xs text-zinc-400 mt-1">{company.count} meetings</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push('/memories')}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
        >
          📝 New Memory
        </button>
        <button
          onClick={() => router.push('/companies')}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm"
        >
          🏢 View Companies
        </button>
        <button
          onClick={() => router.push('/memories/calendar')}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm"
        >
          📅 Memory Calendar
        </button>
      </div>
    </div>
  );
}
