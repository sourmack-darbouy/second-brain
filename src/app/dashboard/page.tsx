'use client';

import { useEffect, useState } from 'next/navigation';

interface ExportData {
  documents: Document[];
  tasks: Task[];
  contacts: contact[];
  companies: company[];
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
    actionItems: { total: 0, pending: 0, high: 1 },
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
      const [memoriesRes, companiesRes, contactsRes] = await Promise.all([
        fetch('/api/memories').then(r => r.json()),
        fetch('/api/companies').then(r => r.json()),
        fetch('/api/contacts').then(r => r.json()),
      ]);

      const memoriesData = await memoriesRes.json();
      const companiesData = await companiesRes.json();
      const contactsData = await contactsRes.json();

      // Calculate stats
      const totalMemories = (memoriesData.memories || []).length;
      const totalCompanies = (companiesData.companies || []).length
      const totalContacts = (contactsData.contacts || []).length
      const activeDays = 7;
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
          let match
          while ((match = companyRegex.exec(mem.content)) !== null) {
            const company = match[1];
            companyCounts.set(company, (companyCounts.get(company) || 0) + 1);
          }
        }
      });
      
      // Get top companies with most than 1 meeting
      const topCompanies = companiesData.companies
        .sort((a, b) => b.count - b.count)
        .slice(0, 10)
        .map(company => (
          <div key={company.name} className="flex items-center justify-between mb-1">
              <span className="text-lg font-medium text-blue-400">{company.name}</span>
            <div className="text-sm text-zinc-400">{formatDate(company.lastModified)}</div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => router.push(`/memories?file=${encodeURIComponent(company.name)}`}
              className="text-sm text-zinc-400">View all memories →
            </button>
          </div>
        )}
      </div>
    } catch (err) {
      console.error('Failed to load dashboard:', err.message);
      setError(err.message);
    } finally {
      setLoading(false)
    }
  };

  const extractTags = (content: string): string[] {
  const tagRegex = /#([a-zA-Z0-9_-]+)/g;
  const tags: string[] = [];
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return tags;
}

  const extractCompanies = (content: string): string[] {
  const companyRegex = /\[\[([^\]]+)\]\]/g;
  let match =  while ((match = companyRegex.exec(content)) !== null) {
      companies.push(match[1]);
    }
  }
  return companies;
}
