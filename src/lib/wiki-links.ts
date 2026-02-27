// Wiki-style linked references utilities

export interface WikiLink {
  title: string;
  sourceMemory: string;
  targetMemory?: string;
  createdAt: string;
}

export interface Backlink {
  sourceMemory: string;
  sourcePath: string;
  context: string;
  lastModified: string;
}

// Extract all [[wiki links]] from content
export function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  
  return [...new Set(links)];
}

// Find backlinks to a memory (memories that link TO this one)
export function findBacklinks(
  targetTitle: string,
  memories: { name: string; path: string; content: string; lastModified: string }[]
): Backlink[] {
  const backlinks: Backlink[] = [];
  const targetRegex = new RegExp(`\\[\\[${escapeRegex(targetTitle)}\\]\\]`, 'gi');
  
  for (const memory of memories) {
    if (targetRegex.test(memory.content)) {
      // Extract context around the link
      const contexts: string[] = [];
      let match;
      const contextRegex = new RegExp(`(.{0,100}\\[\\[${escapeRegex(targetTitle)}\\]\\].{0,100})`, 'gi');
      
      while ((match = contextRegex.exec(memory.content)) !== null) {
        contexts.push(match[1].trim());
      }
      
      backlinks.push({
        sourceMemory: memory.name,
        sourcePath: memory.path,
        context: contexts[0] || `Links to [[${targetTitle}]]`,
        lastModified: memory.lastModified,
      });
    }
  }
  
  return backlinks;
}

// Find forward links from a memory (memories this one links TO)
export function findForwardLinks(
  content: string,
  memories: { name: string; path: string; content: string }[]
): { title: string; exists: boolean; path?: string }[] {
  const links = extractWikiLinks(content);
  
  return links.map(title => {
    // Try to find matching memory
    const matchingMemory = memories.find(m => {
      const nameLower = m.name.toLowerCase();
      const titleLower = title.toLowerCase();
      return nameLower === titleLower || 
             nameLower.includes(titleLower) ||
             titleLower.includes(nameLower);
    });
    
    return {
      title,
      exists: !!matchingMemory,
      path: matchingMemory?.path,
    };
  });
}

// Create a new memory from a wiki link
export function createLinkedMemory(title: string, date: string): { path: string; content: string } {
  const path = `memory/${date}-${title.toLowerCase().replace(/\s+/g, '-')}.md`;
  const content = `# ${title}

Created from wiki link.

## Notes
<!-- Add your notes here -->

## Related
- [[${date}]]
`;

  return { path, content };
}

// Build link graph for visualization
export function buildLinkGraph(
  memories: { name: string; path: string; content: string }[]
): { nodes: { id: string; label: string }[]; edges: { source: string; target: string }[] } {
  const nodes: { id: string; label: string }[] = [];
  const edges: { source: string; target: string }[] = [];
  
  for (const memory of memories) {
    nodes.push({ id: memory.path, label: memory.name });
    
    const links = extractWikiLinks(memory.content);
    for (const link of links) {
      // Find target memory
      const targetMemory = memories.find(m => 
        m.name.toLowerCase() === link.toLowerCase() ||
        m.name.toLowerCase().includes(link.toLowerCase())
      );
      
      if (targetMemory) {
        edges.push({
          source: memory.path,
          target: targetMemory.path,
        });
      } else {
        // Create virtual node for unlinked references
        const virtualId = `virtual:${link}`;
        if (!nodes.find(n => n.id === virtualId)) {
          nodes.push({ id: virtualId, label: link });
        }
        edges.push({
          source: memory.path,
          target: virtualId,
        });
      }
    }
  }
  
  return { nodes, edges };
}

// Escape regex special characters
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Render content with clickable wiki links
export function renderWikiLinks(
  content: string,
  onLinkClick: (title: string) => void
): string {
  return content.replace(
    /\[\[([^\]]+)\]\]/g,
    (match, title) =>
      `<span class="wiki-link text-green-400 bg-green-900/30 px-1 rounded cursor-pointer hover:bg-green-800/50" data-wiki="${title}">[[${title}]]</span>`
  );
}

// Get link statistics
export function getLinkStats(memories: { name: string; path: string; content: string }[]): {
  totalLinks: number;
  uniqueTargets: number;
  orphanLinks: number;
  mostLinked: { title: string; count: number }[];
} {
  const allLinks: string[] = [];
  const linkCounts: Record<string, number> = {};
  
  for (const memory of memories) {
    const links = extractWikiLinks(memory.content);
    allLinks.push(...links);
    
    for (const link of links) {
      linkCounts[link] = (linkCounts[link] || 0) + 1;
    }
  }
  
  const uniqueTargets = Object.keys(linkCounts).length;
  const orphanLinks = Object.keys(linkCounts).filter(title => {
    return !memories.some(m => 
      m.name.toLowerCase() === title.toLowerCase() ||
      m.name.toLowerCase().includes(title.toLowerCase())
    );
  }).length;
  
  const mostLinked = Object.entries(linkCounts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalLinks: allLinks.length,
    uniqueTargets,
    orphanLinks,
    mostLinked,
  };
}
