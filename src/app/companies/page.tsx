'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Company {
  name: string;
  meetingCount: number;
  lastContact: string;
  firstContact: string;
  tags: string[];
  contacts: string[];
  memories: string[];
  recentSnippet: string;
}

interface Stats {
  totalCompanies: number;
  totalMeetings: number;
  recentCompanies: number;
  topTags: { name: string; count: number }[];
}

const TAG_COLORS: Record<string, string> = {
  'tender': 'bg-orange-600',
  'partner': 'bg-blue-600',
  'deal': 'bg-green-600',
  'follow-up': 'bg-yellow-600',
  'meeting': 'bg-purple-600',
  'pricing': 'bg-pink-600',
  'lorawan': 'bg-cyan-600',
  'iot': 'bg-teal-600',
  'actility': 'bg-indigo-600',
  'abeeway': 'bg-rose-600',
  'apac': 'bg-amber-600',
  'hot-lead': 'bg-red-600',
  'mining': 'bg-stone-600',
  'utilities': 'bg-emerald-600',
  'tracking': 'bg-sky-600',
  'atex': 'bg-red-700',
  'oil-gas': 'bg-amber-700',
  'poc': 'bg-violet-600',
};

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'meetings' | 'recent' | 'name'>('meetings');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/companies');
      
      if (!res.ok) {
        throw new Error(`Failed to load companies: ${res.status}`);
      }
      
      const data = await res.json();
      setCompanies(data.companies || []);
      setStats(data.stats || {
        totalCompanies: 0,
        totalMeetings: 0,
        recentCompanies: 0,
        topTags: [],
      });
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      // Set empty state instead of crashing
      setCompanies([]);
      setStats({
        totalCompanies: 0,
        totalMeetings: 0,
        recentCompanies: 0,
        topTags: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort companies
  const filteredCompanies = companies
    .filter(company => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!company.name.toLowerCase().includes(q) &&
            !company.tags.some(t => t.includes(q)) &&
            !company.contacts.some(c => c.toLowerCase().includes(q))) {
          return false;
        }
      }
      if (filterTag && !company.tags.includes(filterTag)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.lastContact.localeCompare(a.lastContact);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.meetingCount - a.meetingCount;
      }
    });

  const formatDate = (date: string) => {
    if (!date || date === '9999-99-99') return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const openCompanyMemories = (company: Company) => {
    // Navigate to memories page with search query
    router.push(`/memories?search=${encodeURIComponent(company.name)}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-zinc-400">Loading companies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          {stats && (
            <p className="text-zinc-400 mt-1">
              {stats.totalCompanies} companies across {stats.totalMeetings} meetings
            </p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div className="text-2xl font-bold text-blue-400">{stats.totalCompanies}</div>
            <div className="text-sm text-zinc-400">Total Companies</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div className="text-2xl font-bold text-green-400">{stats.totalMeetings}</div>
            <div className="text-sm text-zinc-400">Total Meetings</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div className="text-2xl font-bold text-amber-400">{stats.recentCompanies}</div>
            <div className="text-sm text-zinc-400">Active (30 days)</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div className="text-2xl font-bold text-purple-400">{stats.topTags.length}</div>
            <div className="text-sm text-zinc-400">Unique Tags</div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search companies, tags, contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 pl-10"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'meetings' | 'recent' | 'name')}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100"
        >
          <option value="meetings">Most Meetings</option>
          <option value="recent">Recently Contacted</option>
          <option value="name">Alphabetical</option>
        </select>
        {filterTag && (
          <button
            onClick={() => setFilterTag(null)}
            className="bg-red-600/20 text-red-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            #{filterTag} ✕
          </button>
        )}
      </div>

      {/* Top Tags */}
      {stats && stats.topTags.length > 0 && !filterTag && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-zinc-400">Top tags:</span>
          {stats.topTags.slice(0, 15).map(tag => (
            <button
              key={tag.name}
              onClick={() => setFilterTag(tag.name)}
              className={`text-xs px-2 py-1 rounded ${TAG_COLORS[tag.name] || 'bg-zinc-700'} text-white hover:opacity-80`}
            >
              #{tag.name} ({tag.count})
            </button>
          ))}
        </div>
      )}

      {/* Company List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCompanies.map(company => (
          <div
            key={company.name}
            className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
            onClick={() => setSelectedCompany(selectedCompany?.name === company.name ? null : company)}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg text-white truncate flex-1">{company.name}</h3>
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full ml-2">
                {company.meetingCount} meeting{company.meetingCount !== 1 ? 's' : ''}
              </span>
            </div>
            
            {/* Dates */}
            <div className="text-xs text-zinc-500 mb-2">
              {formatDate(company.firstContact)} → {formatDate(company.lastContact)}
            </div>
            
            {/* Tags */}
            {company.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {company.tags.slice(0, 5).map(tag => (
                  <span 
                    key={tag} 
                    className={`text-xs px-1.5 rounded ${TAG_COLORS[tag] || 'bg-zinc-700'} text-white`}
                  >
                    #{tag}
                  </span>
                ))}
                {company.tags.length > 5 && (
                  <span className="text-xs text-zinc-500">+{company.tags.length - 5}</span>
                )}
              </div>
            )}
            
            {/* Contacts */}
            {company.contacts.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {company.contacts.slice(0, 3).map(contact => (
                  <span key={contact} className="text-xs bg-blue-900/50 text-blue-300 px-1.5 rounded">
                    @{contact}
                  </span>
                ))}
                {company.contacts.length > 3 && (
                  <span className="text-xs text-zinc-500">+{company.contacts.length - 3}</span>
                )}
              </div>
            )}
            
            {/* Snippet */}
            {company.recentSnippet && (
              <p className="text-xs text-zinc-400 line-clamp-2 mt-2">
                {company.recentSnippet}
              </p>
            )}
            
            {/* Actions */}
            {selectedCompany?.name === company.name && (
              <div className="mt-3 pt-3 border-t border-zinc-800 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); openCompanyMemories(company); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg"
                >
                  View {company.meetingCount} Meetings
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedCompany(null); }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCompanies.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏢</div>
          <p className="text-zinc-400">No companies found matching your search.</p>
          {filterTag && (
            <button
              onClick={() => setFilterTag(null)}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Clear tag filter
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      {filteredCompanies.length > 0 && filteredCompanies.length !== companies.length && (
        <div className="text-center text-zinc-500 text-sm">
          Showing {filteredCompanies.length} of {companies.length} companies
        </div>
      )}
    </div>
  );
}
