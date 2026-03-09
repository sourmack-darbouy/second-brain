import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

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

// Extract companies from all memories
export async function GET() {
  try {
    const dailyList = await redis.get<string[]>('memories:daily:list') || [];
    
    // Fetch all content in parallel
    const contentPromises = dailyList.map(async (date) => {
      const content = await redis.get<string>(`memories:daily:${date}`);
      return { date, content };
    });
    
    const contents = await Promise.all(contentPromises);
    
    // Build company index
    const companyMap = new Map<string, Company>();
    
    for (const { date, content } of contents) {
      if (!content) continue;
      
      // Extract wiki links [[Company Name]]
      const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
      let match;
      const companiesInMemory = new Set<string>();
      
      while ((match = wikiLinkRegex.exec(content)) !== null) {
        const companyName = match[1].trim();
        companiesInMemory.add(companyName);
      }
      
      // Extract tags and contacts for this memory
      const tags = extractTags(content);
      const contacts = extractContacts(content);
      
      // Update company records
      for (const companyName of companiesInMemory) {
        if (!companyMap.has(companyName)) {
          companyMap.set(companyName, {
            name: companyName,
            meetingCount: 0,
            lastContact: '',
            firstContact: '9999-99-99',
            tags: [],
            contacts: [],
            memories: [],
            recentSnippet: '',
          });
        }
        
        const company = companyMap.get(companyName)!;
        company.meetingCount++;
        company.memories.push(date);
        
        // Track first and last contact
        if (date > company.lastContact) {
          company.lastContact = date;
          // Get snippet around company name
          const idx = content.toLowerCase().indexOf(companyName.toLowerCase());
          if (idx !== -1) {
            const start = Math.max(0, idx - 50);
            const end = Math.min(content.length, idx + companyName.length + 100);
            company.recentSnippet = content.substring(start, end).replace(/\n/g, ' ').trim();
          }
        }
        if (date < company.firstContact) {
          company.firstContact = date;
        }
        
        // Merge tags and contacts
        for (const tag of tags) {
          if (!company.tags.includes(tag)) {
            company.tags.push(tag);
          }
        }
        for (const contact of contacts) {
          if (!company.contacts.includes(contact)) {
            company.contacts.push(contact);
          }
        }
      }
    }
    
    // Sort companies by meeting count
    const companies = Array.from(companyMap.values())
      .sort((a, b) => b.meetingCount - a.meetingCount);
    
    // Calculate stats
    const stats = {
      totalCompanies: companies.length,
      totalMeetings: companies.reduce((sum, c) => sum + c.meetingCount, 0),
      topTags: getTopTags(companies),
      recentCompanies: companies
        .filter(c => c.lastContact >= getDateDaysAgo(30))
        .sort((a, b) => b.lastContact.localeCompare(a.lastContact))
        .slice(0, 10),
    };
    
    return NextResponse.json({ companies, stats });
  } catch (error) {
    console.error('Error building company index:', error);
    return NextResponse.json({ error: 'Failed to build company index' }, { status: 500 });
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

function getTopTags(companies: Company[]): { name: string; count: number }[] {
  const tagCounts = new Map<string, number>();
  for (const company of companies) {
    for (const tag of company.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  return Array.from(tagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
