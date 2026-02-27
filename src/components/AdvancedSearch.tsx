'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SearchProps {
  memories: { name: string; path: string; content: string; lastModified: string }[];
  contacts: { id: string; firstName: string; lastName: string }[];
  tags: { name: string; count: number }[];
  onSelectResult: (path: string) => void;
  onClose: () => void;
}

interface SearchResult {
  memory: { name: string; path: string; content: string; lastModified: string };
  highlights: string[];
  score: number;
  matchedTags: string[];
  matchedContacts: string[];
}

export default function AdvancedSearch({ memories, contacts, tags, onSelectResult, onClose }: SearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState({
    tag: '',
    contact: '',
    dateFrom: '',
    dateTo: '',
    type: 'all' as 'all' | 'daily' | 'long-term',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history).slice(0, 10));
    }
  }, []);

  // Save search history
  const saveToHistory = (q: string) => {
    if (!q.trim() || searchHistory.includes(q)) return;
    const newHistory = [q, ...searchHistory].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  // Perform search
  const performSearch = useCallback((searchQuery: string, searchFilters: typeof filters) => {
    if (!searchQuery.trim() && !searchFilters.tag && !searchFilters.contact) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const searchResults: SearchResult[] = [];
    const queryLower = searchQuery.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);

    for (const memory of memories) {
      let score = 0;
      const highlights: string[] = [];
      const matchedTags: string[] = [];
      const matchedContacts: string[] = [];

      // Apply type filter
      if (searchFilters.type !== 'all') {
        const isDaily = memory.path.includes('memory/');
        if (searchFilters.type === 'daily' && !isDaily) continue;
        if (searchFilters.type === 'long-term' && isDaily) continue;
      }

      // Apply date filter
      if (searchFilters.dateFrom && memory.lastModified < searchFilters.dateFrom) continue;
      if (searchFilters.dateTo && memory.lastModified > searchFilters.dateTo + 'T23:59:59') continue;

      const contentLower = memory.content.toLowerCase();

      // Check for tag filter
      if (searchFilters.tag) {
        const tagPattern = new RegExp(`#${searchFilters.tag.toLowerCase()}\\b`);
        if (!tagPattern.test(contentLower)) continue;
        matchedTags.push(searchFilters.tag);
        score += 10;
      }

      // Check for contact filter
      if (searchFilters.contact) {
        const contactPattern = new RegExp(`@${searchFilters.contact}`, 'i');
        if (!contactPattern.test(memory.content)) continue;
        matchedContacts.push(searchFilters.contact);
        score += 10;
      }

      // Text search
      if (searchQuery.trim()) {
        // Exact phrase match
        if (contentLower.includes(queryLower)) {
          score += 20;
        }

        // Word matches
        for (const word of queryWords) {
          if (contentLower.includes(word)) {
            score += 5;
          }
          // Title match bonus
          if (memory.name.toLowerCase().includes(word)) {
            score += 10;
          }
        }

        // Extract highlights (context around matches)
        for (const word of queryWords) {
          const regex = new RegExp(`(.{0,50}${word}.{0,50})`, 'gi');
          const matches = memory.content.match(regex);
          if (matches) {
            highlights.push(...matches.slice(0, 2));
          }
        }

        // Extract matched tags from content
        const tagMatches = memory.content.match(/#([a-zA-Z0-9_-]+)/g) || [];
        for (const tag of tagMatches) {
          const tagName = tag.replace('#', '').toLowerCase();
          if (queryWords.some(w => tagName.includes(w))) {
            matchedTags.push(tagName);
          }
        }

        // Extract matched contacts from content
        const contactMatches = memory.content.match(/@([A-Z][a-zA-Z]+\s?[A-Z]?[a-zA-Z]*)/g) || [];
        for (const contact of contactMatches) {
          const contactName = contact.replace('@', '').toLowerCase();
          if (queryWords.some(w => contactName.includes(w))) {
            matchedContacts.push(contact.replace('@', ''));
          }
        }
      }

      if (score > 0 || (!searchQuery.trim() && (searchFilters.tag || searchFilters.contact))) {
        searchResults.push({
          memory,
          highlights: [...new Set(highlights)].slice(0, 3),
          score: searchQuery.trim() ? score : 1,
          matchedTags: [...new Set(matchedTags)],
          matchedContacts: [...new Set(matchedContacts)],
        });
      }
    }

    // Sort by score
    searchResults.sort((a, b) => b.score - a.score);
    setResults(searchResults.slice(0, 20));
    setSelectedIndex(0);
    setIsSearching(false);
  }, [memories]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, filters);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, filters, performSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        saveToHistory(query);
        onSelectResult(results[selectedIndex].memory.path);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, query, onClose, onSelectResult]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Highlight matching text
  const highlightText = (text: string, searchWords: string[]) => {
    if (!searchWords.length) return text;
    
    let result = text;
    for (const word of searchWords) {
      const regex = new RegExp(`(${word})`, 'gi');
      result = result.replace(regex, '<mark class="bg-yellow-500/50 text-yellow-200 px-0.5 rounded">$1</mark>');
    }
    return result;
  };

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-20 p-4">
      <div className="bg-zinc-900 rounded-lg w-full max-w-3xl border border-zinc-700 shadow-2xl">
        {/* Search Input */}
        <div className="p-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories... (try @contact, #tag, or any text)"
              className="flex-1 bg-transparent text-lg outline-none text-white placeholder-zinc-500"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-lg text-sm ${showFilters ? 'bg-blue-600' : 'bg-zinc-700 hover:bg-zinc-600'}`}
            >
              Filters
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-2">✕</button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Tag</label>
                <select
                  value={filters.tag}
                  onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Any tag</option>
                  {tags.map(t => (
                    <option key={t.name} value={t.name}>#{t.name} ({t.count})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Contact</label>
                <select
                  value={filters.contact}
                  onChange={(e) => setFilters({ ...filters, contact: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Any contact</option>
                  {contacts.map(c => (
                    <option key={c.id} value={`${c.firstName} ${c.lastName}`}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Search History (when no query) */}
        {!query && searchHistory.length > 0 && (
          <div className="p-3 border-b border-zinc-800">
            <div className="text-xs text-zinc-500 mb-2">Recent searches</div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(h)}
                  className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-full text-sm"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="max-h-[60vh] overflow-auto">
          {isSearching ? (
            <div className="p-8 text-center text-zinc-400">
              <div className="animate-spin text-2xl mb-2">🔍</div>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-zinc-800">
              {results.map((result, i) => (
                <button
                  key={result.memory.path}
                  onClick={() => {
                    saveToHistory(query);
                    onSelectResult(result.memory.path);
                    onClose();
                  }}
                  className={`w-full text-left p-4 hover:bg-zinc-800 transition ${
                    i === selectedIndex ? 'bg-zinc-800 ring-1 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-200">{result.memory.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {new Date(result.memory.lastModified).toLocaleDateString()}
                      </div>
                      
                      {/* Highlights */}
                      {result.highlights.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {result.highlights.map((h, hi) => (
                            <div
                              key={hi}
                              className="text-sm text-zinc-400 line-clamp-1"
                              dangerouslySetInnerHTML={{ __html: highlightText(h, queryWords) }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Matched tags/contacts */}
                      {(result.matchedTags.length > 0 || result.matchedContacts.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.matchedTags.slice(0, 3).map(t => (
                            <span key={t} className="text-xs bg-purple-900/50 text-purple-300 px-1.5 rounded">#{t}</span>
                          ))}
                          {result.matchedContacts.slice(0, 3).map(c => (
                            <span key={c} className="text-xs bg-blue-900/50 text-blue-300 px-1.5 rounded">@{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Score: {result.score}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="p-8 text-center text-zinc-400">
              No results found for "{query}"
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
