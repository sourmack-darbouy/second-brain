'use client';

import { useState, useEffect } from 'react';
import { 
  extractWikiLinks, 
  findBacklinks, 
  findForwardLinks, 
  getLinkStats,
  Backlink 
} from '@/lib/wiki-links';

interface WikiLinksPanelProps {
  currentMemory: { name: string; path: string; content: string; lastModified: string };
  memories: { name: string; path: string; content: string; lastModified: string }[];
  onNavigate: (path: string) => void;
  onCreateMemory: (title: string) => void;
}

export default function WikiLinksPanel({ 
  currentMemory, 
  memories, 
  onNavigate, 
  onCreateMemory 
}: WikiLinksPanelProps) {
  const [forwardLinks, setForwardLinks] = useState<{ title: string; exists: boolean; path?: string }[]>([]);
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [showAllBacklinks, setShowAllBacklinks] = useState(false);
  const [linkStats, setLinkStats] = useState<ReturnType<typeof getLinkStats> | null>(null);

  useEffect(() => {
    // Calculate forward links (links FROM this memory)
    const forwards = findForwardLinks(currentMemory.content, memories);
    setForwardLinks(forwards);

    // Calculate backlinks (links TO this memory)
    const backs = findBacklinks(currentMemory.name, memories.filter(m => m.path !== currentMemory.path));
    setBacklinks(backs);

    // Calculate link stats
    const stats = getLinkStats(memories);
    setLinkStats(stats);
  }, [currentMemory, memories]);

  const displayBacklinks = showAllBacklinks ? backlinks : backlinks.slice(0, 3);

  if (forwardLinks.length === 0 && backlinks.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4 mb-4">
      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
        🔗 Linked References
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Forward Links */}
        {forwardLinks.length > 0 && (
          <div>
            <div className="text-xs text-zinc-400 mb-2">
              Links from here ({forwardLinks.length})
            </div>
            <div className="space-y-1.5">
              {forwardLinks.map((link, i) => (
                <div key={i} className="flex items-center justify-between">
                  {link.exists ? (
                    <button
                      onClick={() => link.path && onNavigate(link.path)}
                      className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1"
                    >
                      <span className="text-xs">→</span>
                      [[{link.title}]]
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-500">
                        [[{link.title}]]
                      </span>
                      <button
                        onClick={() => onCreateMemory(link.title)}
                        className="text-xs bg-zinc-700 hover:bg-zinc-600 px-2 py-0.5 rounded text-zinc-300"
                      >
                        Create
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backlinks */}
        {backlinks.length > 0 && (
          <div>
            <div className="text-xs text-zinc-400 mb-2">
              Links to here ({backlinks.length})
            </div>
            <div className="space-y-2">
              {displayBacklinks.map((backlink, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(backlink.sourcePath)}
                  className="w-full text-left bg-zinc-700/50 hover:bg-zinc-700 rounded p-2 transition"
                >
                  <div className="text-sm font-medium text-blue-400">
                    ← {backlink.sourceMemory}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {backlink.context}
                  </div>
                </button>
              ))}
              {backlinks.length > 3 && (
                <button
                  onClick={() => setShowAllBacklinks(!showAllBacklinks)}
                  className="text-xs text-zinc-400 hover:text-zinc-300"
                >
                  {showAllBacklinks ? 'Show less' : `Show all ${backlinks.length} backlinks`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Link Stats */}
      {linkStats && (forwardLinks.length > 0 || backlinks.length > 0) && (
        <div className="mt-4 pt-3 border-t border-zinc-700">
          <div className="text-xs text-zinc-500 flex items-center gap-4">
            <span>📊 {linkStats.totalLinks} total links</span>
            <span>🎯 {linkStats.uniqueTargets} unique targets</span>
            {linkStats.orphanLinks > 0 && (
              <span className="text-yellow-500">⚠️ {linkStats.orphanLinks} orphan links</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
