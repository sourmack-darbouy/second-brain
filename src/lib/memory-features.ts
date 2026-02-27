// Memory enhancement utilities

export interface MemoryMention {
  type: 'contact' | 'tag' | 'link' | 'project' | 'deal';
  value: string;
  start: number;
  end: number;
}

export interface ContactMention {
  contactId: string;
  contactName: string;
  memoryPath: string;
  memoryDate: string;
  context: string; // surrounding text
  timestamp: string;
}

export interface Tag {
  name: string;
  color: string;
  count: number;
}

// Parse @mentions and #tags from memory content
export function parseMemoryContent(content: string): {
  mentions: MemoryMention[];
  tags: string[];
  contacts: string[];
  links: string[];
} {
  const mentions: MemoryMention[] = [];
  const tags: Set<string> = new Set();
  const contacts: Set<string> = new Set();
  const links: Set<string> = new Set();

  // Match @ContactName mentions
  const contactRegex = /@([A-Z][a-zA-Z]+\s?[A-Z]?[a-zA-Z]*)/g;
  let match;
  while ((match = contactRegex.exec(content)) !== null) {
    contacts.add(match[1].trim());
    mentions.push({
      type: 'contact',
      value: match[1].trim(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Match #tags
  const tagRegex = /#([a-zA-Z0-9_-]+)/g;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.add(match[1].toLowerCase());
    mentions.push({
      type: 'tag',
      value: match[1].toLowerCase(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Match [[Wiki Links]]
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  while ((match = linkRegex.exec(content)) !== null) {
    links.add(match[1]);
    mentions.push({
      type: 'link',
      value: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return {
    mentions,
    tags: Array.from(tags),
    contacts: Array.from(contacts),
    links: Array.from(links),
  };
}

// Convert markdown with mentions to rendered HTML
export function renderMemoryWithMentions(
  content: string,
  contacts: { id: string; firstName: string; lastName: string }[]
): string {
  let rendered = content;

  // Escape HTML
  rendered = rendered
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert @Mentions to clickable links
  rendered = rendered.replace(
    /@([A-Z][a-zA-Z]+\s?[A-Z]?[a-zA-Z]*)/g,
    (match, name) => {
      const contact = contacts.find(
        c => `${c.firstName} ${c.lastName}`.toLowerCase() === name.toLowerCase()
      );
      if (contact) {
        return `<a href="/contacts?highlight=${contact.id}" class="text-blue-400 hover:text-blue-300 bg-blue-900/30 px-1 rounded">@${name}</a>`;
      }
      return `<span class="text-yellow-400 bg-yellow-900/30 px-1 rounded">@${name}</span>`;
    }
  );

  // Convert #tags to clickable badges
  rendered = rendered.replace(
    /#([a-zA-Z0-9_-]+)/g,
    (match, tag) =>
      `<a href="/memories?tag=${tag}" class="text-purple-400 hover:text-purple-300 bg-purple-900/30 px-1 rounded">#${tag}</a>`
  );

  // Convert [[Wiki Links]] to clickable links
  rendered = rendered.replace(
    /\[\[([^\]]+)\]\]/g,
    (match, link) =>
      `<a href="/memories?project=${encodeURIComponent(link)}" class="text-green-400 hover:text-green-300 bg-green-900/30 px-1 rounded">[[${link}]]</a>`
  );

  // Convert line breaks
  rendered = rendered.replace(/\n/g, '<br/>');

  return rendered;
}

// Extract context around a mention (for contact profile)
export function extractMentionContext(
  content: string,
  mentionName: string,
  contextChars: number = 50
): string {
  const regex = new RegExp(`@${mentionName}`, 'gi');
  const match = regex.exec(content);
  
  if (!match) return '';
  
  const start = Math.max(0, match.index - contextChars);
  const end = Math.min(content.length, match.index + mentionName.length + 1 + contextChars);
  
  let context = content.slice(start, end);
  
  if (start > 0) context = '...' + context;
  if (end < content.length) context = context + '...';
  
  return context;
}

// Detect action items in memory content
export function extractActionItems(content: string): {
  text: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
}[] {
  const items: { text: string; dueDate?: string; priority: 'high' | 'medium' | 'low' }[] = [];

  // Match [ ] or - [ ] patterns
  const checkboxRegex = /[-*]?\s*\[\s*\]\s*(.+)/g;
  let match;
  while ((match = checkboxRegex.exec(content)) !== null) {
    let text = match[1].trim();
    let priority: 'high' | 'medium' | 'low' = 'medium';
    let dueDate: string | undefined;

    // Check for priority markers
    if (text.includes('!!!') || text.toLowerCase().includes('urgent')) {
      priority = 'high';
      text = text.replace(/!!!/g, '').replace(/urgent:?/gi, '').trim();
    } else if (text.includes('!') || text.toLowerCase().includes('important')) {
      priority = 'medium';
      text = text.replace(/!/g, '').replace(/important:?/gi, '').trim();
    }

    // Check for due dates (by Friday, by 2024-01-15, etc.)
    const dateMatch = text.match(/by\s+(.+?)(?:\s*$|[,;])/i);
    if (dateMatch) {
      dueDate = dateMatch[1];
      text = text.replace(dateMatch[0], '').trim();
    }

    items.push({ text, dueDate, priority });
  }

  // Match "follow up with" patterns
  const followUpRegex = /follow[\s-]?up\s+(?:with\s+)?(.+?)(?:\s+by\s+(.+?))?(?:\s*$|[,;.])/gi;
  while ((match = followUpRegex.exec(content)) !== null) {
    items.push({
      text: `Follow up with ${match[1].trim()}`,
      dueDate: match[2]?.trim(),
      priority: 'medium',
    });
  }

  return items;
}

// Detect dates mentioned in content
export function extractDates(content: string): {
  text: string;
  date: Date;
  type: 'meeting' | 'deadline' | 'reminder' | 'mention';
}[] {
  const dates: { text: string; date: Date; type: 'meeting' | 'deadline' | 'reminder' | 'mention' }[] = [];

  // Match "tomorrow", "next week", "on Friday", etc.
  const relativeDateRegex = /\b(tomorrow|next week|next month|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi;
  // This would need proper date parsing library for production

  // Match ISO dates
  const isoDateRegex = /\b(\d{4}-\d{2}-\d{2})\b/g;
  let match;
  while ((match = isoDateRegex.exec(content)) !== null) {
    dates.push({
      text: match[1],
      date: new Date(match[1]),
      type: 'mention',
    });
  }

  return dates;
}

// Generate tag suggestions based on content
export function suggestTags(content: string): string[] {
  const suggestions: string[] = [];
  const lower = content.toLowerCase();

  // Business/sales keywords
  if (lower.includes('tender') || lower.includes('rfp') || lower.includes('proposal')) {
    suggestions.push('tender');
  }
  if (lower.includes('partner') || lower.includes('partnership')) {
    suggestions.push('partner');
  }
  if (lower.includes('deal') || lower.includes('contract') || lower.includes('signed')) {
    suggestions.push('deal');
  }
  if (lower.includes('follow up') || lower.includes('follow-up')) {
    suggestions.push('follow-up');
  }
  if (lower.includes('meeting') || lower.includes('call')) {
    suggestions.push('meeting');
  }
  if (lower.includes('quote') || lower.includes('pricing')) {
    suggestions.push('pricing');
  }

  // LoRaWAN/IoT keywords
  if (lower.includes('lorawan') || lower.includes('lora')) {
    suggestions.push('lorawan');
  }
  if (lower.includes('iot') || lower.includes('internet of things')) {
    suggestions.push('iot');
  }
  if (lower.includes('gateway') || lower.includes('gateways')) {
    suggestions.push('gateway');
  }
  if (lower.includes('tracker') || lower.includes('tracking')) {
    suggestions.push('tracking');
  }

  // Company/product keywords
  if (lower.includes('actility') || lower.includes('thingpark')) {
    suggestions.push('actility');
  }
  if (lower.includes('abeeway')) {
    suggestions.push('abeeway');
  }

  // Region keywords
  if (lower.includes('apac') || lower.includes('asia pacific')) {
    suggestions.push('apac');
  }
  if (lower.includes('australia') || lower.includes('aus')) {
    suggestions.push('australia');
  }

  return [...new Set(suggestions)];
}

// Default tag colors
export const TAG_COLORS: Record<string, string> = {
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
};
