import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Server-side search across all memories
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const tag = searchParams.get('tag');
  const contact = searchParams.get('contact');
  const dateFrom = searchParams.get('from');
  const dateTo = searchParams.get('to');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  if (!query && !tag && !contact) {
    return NextResponse.json({ results: [], count: 0, message: 'Enter a search query' });
  }
  
  try {
    // Get all daily memory dates
    const dailyList = await redis.get<string[]>('memories:daily:list') || [];
    
    // Filter by date first
    let datesToSearch = dailyList;
    if (dateFrom || dateTo) {
      datesToSearch = dailyList.filter(date => {
        if (dateFrom && date < dateFrom) return false;
        if (dateTo && date > dateTo) return false;
        return true;
      });
    }
    
    // Fetch all content in parallel (much faster)
    const contentPromises = datesToSearch.map(async (date) => {
      const content = await redis.get<string>(`memories:daily:${date}`);
      return { date, content };
    });
    
    const contents = await Promise.all(contentPromises);
    
    // Search through results
    const results: any[] = [];
    
    for (const { date, content } of contents) {
      if (!content) continue;
      
      const contentLower = content.toLowerCase();
      let score = 0;
      const matches: string[] = [];
      
      // Extract tags and contacts from content
      const tags = extractTags(content);
      const contacts = extractContacts(content);
      
      // Tag filter
      if (tag && !tags.includes(tag.toLowerCase())) continue;
      
      // Contact filter
      if (contact && !contacts.some(c => c.toLowerCase().includes(contact.toLowerCase()))) continue;
      
      // Text search
      if (query) {
        // Check title/name
        if (date.toLowerCase().includes(query)) {
          score += 10;
          matches.push(`Date: ${date}`);
        }
        
        // Check content
        if (contentLower.includes(query)) {
          score += 5;
          
          // Count occurrences
          const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          const count = (content.match(regex) || []).length;
          score += count;
          
          matches.push(`${count} match${count > 1 ? 'es' : ''}`);
        }
        
        // Check company/wiki links
        const wikiLinks = extractWikiLinks(content);
        for (const link of wikiLinks) {
          if (link.toLowerCase().includes(query)) {
            score += 8;
            matches.push(`Company: ${link}`);
          }
        }
        
        // Check tags
        for (const t of tags) {
          if (t.includes(query)) {
            score += 3;
            matches.push(`Tag: #${t}`);
          }
        }
        
        // Check contacts
        for (const c of contacts) {
          if (c.toLowerCase().includes(query)) {
            score += 3;
            matches.push(`Contact: @${c}`);
          }
        }
        
        if (score === 0) continue;
      } else {
        // No query, just filtering by tag/contact
        score = 1;
      }
      
      // Create snippet with context around match
      let snippet = '';
      if (query && contentLower.includes(query)) {
        const idx = contentLower.indexOf(query);
        const start = Math.max(0, idx - 80);
        const end = Math.min(content.length, idx + query.length + 120);
        snippet = (start > 0 ? '...' : '') + 
                  content.substring(start, end).replace(/\n/g, ' ') + 
                  (end < content.length ? '...' : '');
      } else {
        // First 200 chars of actual content (skip title)
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        snippet = lines.slice(0, 3).join(' ').substring(0, 200) + '...';
      }
      
      results.push({
        path: `memory/${date}.md`,
        name: date,
        type: 'daily',
        lastModified: date,
        score,
        matches,
        snippet,
        tags: tags.slice(0, 5),
        contacts: contacts.slice(0, 3),
      });
    }
    
    // Sort by date (most recent first), then by score
    results.sort((a, b) => {
      // Primary: date (most recent first)
      const dateCompare = b.name.localeCompare(a.name);
      if (dateCompare !== 0) return dateCompare;
      // Secondary: score (relevance)
      return b.score - a.score;
    });
    
    // Limit results
    const limited = results.slice(0, limit);
    
    return NextResponse.json({ 
      results: limited, 
      count: results.length,
      total: dailyList.length,
      query: { text: query, tag, contact, dateFrom, dateTo }
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

function extractTags(content: string): string[] {
  const tags: string[] = [];
  const regex = /#([a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return [...new Set(tags)];
}

function extractContacts(content: string): string[] {
  const contacts: string[] = [];
  const regex = /@([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    contacts.push(match[1]);
  }
  return [...new Set(contacts)];
}

function extractWikiLinks(content: string): string[] {
  const links: string[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}
