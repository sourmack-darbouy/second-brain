import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { 
  parseMemoryContent, 
  extractActionItems, 
  suggestTags,
  ContactMention 
} from '@/lib/memory-features';

const redis = Redis.fromEnv();

// GET: Enhanced memory data with mentions, tags, analytics
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  // Get all tags with counts
  if (action === 'tags') {
    const memories = await getAllMemories();
    const tagCounts: Record<string, number> = {};
    
    for (const memory of memories) {
      const { tags } = parseMemoryContent(memory.content);
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    
    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    return NextResponse.json({ tags });
  }
  
  // Get all mentions of a specific contact
  if (action === 'contact-mentions') {
    const contactName = searchParams.get('contact');
    if (!contactName) {
      return NextResponse.json({ error: 'Contact name required' }, { status: 400 });
    }
    
    const memories = await getAllMemories();
    const mentions: ContactMention[] = [];
    
    for (const memory of memories) {
      const { contacts } = parseMemoryContent(memory.content);
      if (contacts.some(c => c.toLowerCase() === contactName.toLowerCase())) {
        // Extract context around mention
        const regex = new RegExp(`(.{0,100}@${contactName}.{0,100})`, 'gi');
        const matches = memory.content.match(regex) || [];
        
        mentions.push({
          contactId: '', // Would need to map to actual contact
          contactName,
          memoryPath: memory.path,
          memoryDate: memory.name,
          context: matches[0] || `Mentioned in ${memory.name}`,
          timestamp: memory.lastModified,
        });
      }
    }
    
    return NextResponse.json({ mentions });
  }
  
  // Get all action items across memories
  if (action === 'action-items') {
    const memories = await getAllMemories();
    const allItems: { memory: string; items: ReturnType<typeof extractActionItems> }[] = [];
    
    for (const memory of memories) {
      const items = extractActionItems(memory.content);
      if (items.length > 0) {
        allItems.push({ memory: memory.name, items });
      }
    }
    
    return NextResponse.json({ actionItems: allItems });
  }
  
  // Get tag suggestions for content
  if (action === 'suggest-tags') {
    const content = searchParams.get('content') || '';
    const suggestions = suggestTags(content);
    return NextResponse.json({ suggestions });
  }
  
  // Get memories filtered by tag
  if (action === 'by-tag') {
    const tag = searchParams.get('tag');
    if (!tag) {
      return NextResponse.json({ error: 'Tag required' }, { status: 400 });
    }
    
    const memories = await getAllMemories();
    const filtered = memories.filter(m => {
      const { tags } = parseMemoryContent(m.content);
      return tags.includes(tag.toLowerCase());
    });
    
    return NextResponse.json({ memories: filtered });
  }
  
  // Get memory analytics
  if (action === 'analytics') {
    const memories = await getAllMemories();
    
    const analytics = {
      totalMemories: memories.length,
      totalWords: memories.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0),
      memoriesThisWeek: 0,
      memoriesThisMonth: 0,
      topTags: [] as { name: string; count: number }[],
      topContacts: [] as { name: string; count: number }[],
      actionItemsPending: 0,
      recentActivity: [] as { date: string; count: number }[],
    };
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const tagCounts: Record<string, number> = {};
    const contactCounts: Record<string, number> = {};
    const activityByDate: Record<string, number> = {};
    
    for (const memory of memories) {
      const memoryDate = new Date(memory.lastModified);
      
      if (memoryDate >= weekAgo) analytics.memoriesThisWeek++;
      if (memoryDate >= monthAgo) analytics.memoriesThisMonth++;
      
      const { tags, contacts } = parseMemoryContent(memory.content);
      
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
      
      for (const contact of contacts) {
        contactCounts[contact] = (contactCounts[contact] || 0) + 1;
      }
      
      const items = extractActionItems(memory.content);
      analytics.actionItemsPending += items.length;
      
      const dateKey = memory.lastModified.split('T')[0];
      activityByDate[dateKey] = (activityByDate[dateKey] || 0) + 1;
    }
    
    analytics.topTags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    analytics.topContacts = Object.entries(contactCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    analytics.recentActivity = Object.entries(activityByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(-30);
    
    return NextResponse.json({ analytics });
  }
  
  // Search memories
  if (action === 'search') {
    const query = searchParams.get('q')?.toLowerCase() || '';
    const tag = searchParams.get('tag');
    const contact = searchParams.get('contact');
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    
    let memories = await getAllMemories();
    
    // Filter by search query
    if (query) {
      memories = memories.filter(m => 
        m.content.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query)
      );
    }
    
    // Filter by tag
    if (tag) {
      memories = memories.filter(m => {
        const { tags } = parseMemoryContent(m.content);
        return tags.includes(tag.toLowerCase());
      });
    }
    
    // Filter by contact mention
    if (contact) {
      memories = memories.filter(m => {
        const { contacts } = parseMemoryContent(m.content);
        return contacts.some(c => c.toLowerCase() === contact.toLowerCase());
      });
    }
    
    // Filter by date range
    if (dateFrom) {
      memories = memories.filter(m => m.lastModified >= dateFrom);
    }
    if (dateTo) {
      memories = memories.filter(m => m.lastModified <= dateTo + 'T23:59:59');
    }
    
    return NextResponse.json({ memories, count: memories.length });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// POST: Update memory index (mentions, tags, etc.)
export async function POST(request: Request) {
  const { action, memoryPath, content } = await request.json();
  
  if (action === 'reindex') {
    // Reindex a specific memory's mentions and tags
    const { tags, contacts, links } = parseMemoryContent(content);
    
    // Store tag index
    for (const tag of tags) {
      const tagMemories = await redis.get<string[]>(`tags:${tag}:memories`) || [];
      if (!tagMemories.includes(memoryPath)) {
        tagMemories.push(memoryPath);
        await redis.set(`tags:${tag}:memories`, tagMemories);
      }
    }
    
    // Store contact mention index
    for (const contact of contacts) {
      const contactMemories = await redis.get<string[]>(`contacts:${contact.toLowerCase()}:mentions`) || [];
      if (!contactMemories.includes(memoryPath)) {
        contactMemories.push(memoryPath);
        await redis.set(`contacts:${contact.toLowerCase()}:mentions`, contactMemories);
      }
    }
    
    return NextResponse.json({ success: true, tags, contacts, links });
  }
  
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// Helper to get all memories
async function getAllMemories() {
  const memories: { 
    name: string; 
    path: string; 
    content: string; 
    lastModified: string; 
    type: 'long-term' | 'daily';
    attachments?: string[];
  }[] = [];

  // Get long-term memory
  const longTermContent = await redis.get<string>('memories:longterm');
  const longTermMeta = await redis.get<{ lastModified: string }>('memories:longterm:meta');
  const longTermAttachments = await redis.get<string[]>(`memories:attachments:MEMORY.md`) || [];
  
  if (longTermContent) {
    memories.push({
      name: 'Long-term Memory',
      path: 'MEMORY.md',
      content: longTermContent,
      lastModified: longTermMeta?.lastModified || new Date().toISOString(),
      type: 'long-term',
      attachments: longTermAttachments,
    });
  }

  // Get daily notes
  const dailyList = await redis.get<string[]>('memories:daily:list') || [];
  
  for (const date of dailyList) {
    const content = await redis.get<string>(`memories:daily:${date}`);
    const meta = await redis.get<{ lastModified: string }>(`memories:daily:${date}:meta`);
    const attachments = await redis.get<string[]>(`memories:attachments:memory/${date}.md`) || [];
    
    if (content) {
      memories.push({
        name: date,
        path: `memory/${date}.md`,
        content,
        lastModified: meta?.lastModified || new Date().toISOString(),
        type: 'daily',
        attachments,
      });
    }
  }

  return memories.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}
