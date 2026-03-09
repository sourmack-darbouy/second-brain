'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MobileHeader() {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/memories?search=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Mobile Search Overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-zinc-950 sm:hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setShowSearch(false)}
                className="text-zinc-400 p-2"
              >
                ✕
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search memories, companies..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white pl-10"
                  autoFocus
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
              </div>
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                className="bg-blue-600 disabled:bg-zinc-700 px-4 py-3 rounded-lg text-white font-medium"
              >
                Search
              </button>
            </div>
            
            {/* Quick Search Suggestions */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 mb-3">Recent searches:</p>
              {['BHP', 'mining', 'partner', 'follow-up'].map(q => (
                <button
                  key={q}
                  onClick={() => {
                    setSearchQuery(q);
                    router.push(`/memories?search=${q}`);
                    setShowSearch(false);
                  }}
                  className="block w-full text-left px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300"
                >
                  🔍 {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
