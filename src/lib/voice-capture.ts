// Voice capture utilities

export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration: number;
  timestamp: string;
}

export interface StructuredMemory {
  title: string;
  type: 'meeting' | 'call' | 'note' | 'idea' | 'reminder';
  summary: string;
  attendees: string[];
  keyPoints: string[];
  actionItems: { text: string; assignee?: string; dueDate?: string }[];
  tags: string[];
  contacts: string[];
  rawTranscript: string;
}

// Speech recognition setup (browser API)
export function createSpeechRecognition(): {
  recognition: any;
  isSupported: boolean;
} {
  if (typeof window === 'undefined') {
    return { recognition: null, isSupported: false };
  }

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    return { recognition: null, isSupported: false };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  return { recognition, isSupported: true };
}

// Format duration in mm:ss
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Detect memory type from content
export function detectMemoryType(text: string): StructuredMemory['type'] {
  const lower = text.toLowerCase();
  
  if (lower.includes('meeting') || lower.includes('call with') || lower.includes('discussed with')) {
    return 'meeting';
  }
  if (lower.includes('call') || lower.includes('phone') || lower.includes('spoke to')) {
    return 'call';
  }
  if (lower.includes('remember') || lower.includes('remind me') || lower.includes('don\'t forget')) {
    return 'reminder';
  }
  if (lower.includes('idea') || lower.includes('what if') || lower.includes('maybe we could')) {
    return 'idea';
  }
  
  return 'note';
}

// Extract contacts from text
export function extractContacts(text: string): string[] {
  const contacts: string[] = [];
  
  // Match "with [Name]", "met [Name]", "spoke to [Name]", "[Name] said"
  const patterns = [
    /(?:with|met|spoke to|called|talked to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:said|mentioned|told|asked)/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      // Filter out common words that might be captured
      const exclude = ['The', 'This', 'That', 'Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      if (!exclude.includes(name) && name.length > 2) {
        contacts.push(name);
      }
    }
  }
  
  return [...new Set(contacts)];
}

// Extract action items from text
export function extractVoiceActionItems(text: string): { text: string; assignee?: string; dueDate?: string }[] {
  const items: { text: string; assignee?: string; dueDate?: string }[] = [];
  const lower = text.toLowerCase();
  
  // Patterns for action items
  const patterns = [
    /(?:need to|have to|should|must|will)\s+(.+?)(?:\.|,|before|by|tomorrow|today|$)/gi,
    /(?:follow up|follow-up|followup)\s+(?:with\s+)?(.+?)(?:\.|,|by|before|tomorrow|today|$)/gi,
    /(?:send|email|call|message|write)\s+(.+?)(?:\.|,|by|before|tomorrow|today|$)/gi,
    /(?:remember to|don't forget to|make sure to)\s+(.+?)(?:\.|,|$)/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let item = match[1].trim();
      
      // Check for assignee
      let assignee: string | undefined;
      const assigneeMatch = item.match(/(.+?)\s+to\s+(.+)/);
      if (assigneeMatch) {
        assignee = assigneeMatch[1];
        item = assigneeMatch[2];
      }
      
      // Check for due date references
      let dueDate: string | undefined;
      if (lower.includes('tomorrow')) dueDate = 'tomorrow';
      else if (lower.includes('today')) dueDate = 'today';
      else if (lower.includes('next week')) dueDate = 'next week';
      else if (lower.includes('by friday')) dueDate = 'Friday';
      else if (lower.includes('by monday')) dueDate = 'Monday';
      
      if (item.length > 5 && !items.some(i => i.text === item)) {
        items.push({ text: item, assignee, dueDate });
      }
    }
  }
  
  return items;
}

// Extract key points from text
export function extractKeyPoints(text: string): string[] {
  const points: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  // Look for sentences with key indicators
  const indicators = ['important', 'key', 'main', 'critical', 'essential', 'focus', 'priority', 'decided', 'agreed'];
  
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (indicators.some(i => lower.includes(i))) {
      points.push(sentence.trim());
    }
  }
  
  // If no indicators found, take first 3 substantive sentences
  if (points.length === 0 && sentences.length > 0) {
    return sentences.slice(0, 3).map(s => s.trim());
  }
  
  return points.slice(0, 5);
}

// Suggest tags from voice content
export function suggestVoiceTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();
  
  // Business/sales
  if (lower.includes('tender') || lower.includes('rfp') || lower.includes('proposal')) tags.push('tender');
  if (lower.includes('partner') || lower.includes('partnership')) tags.push('partner');
  if (lower.includes('deal') || lower.includes('contract') || lower.includes('signed')) tags.push('deal');
  if (lower.includes('follow up') || lower.includes('follow-up')) tags.push('follow-up');
  if (lower.includes('meeting') || lower.includes('call')) tags.push('meeting');
  if (lower.includes('quote') || lower.includes('pricing') || lower.includes('price')) tags.push('pricing');
  if (lower.includes('demo') || lower.includes('demonstration')) tags.push('demo');
  
  // Technology
  if (lower.includes('lorawan') || lower.includes('lora')) tags.push('lorawan');
  if (lower.includes('iot')) tags.push('iot');
  if (lower.includes('gateway') || lower.includes('gateways')) tags.push('gateway');
  if (lower.includes('tracker') || lower.includes('tracking')) tags.push('tracking');
  if (lower.includes('sensor') || lower.includes('sensors')) tags.push('sensor');
  
  // Companies
  if (lower.includes('actility') || lower.includes('thingpark')) tags.push('actility');
  if (lower.includes('abeeway')) tags.push('abeeway');
  
  // Regions
  if (lower.includes('apac') || lower.includes('asia pacific')) tags.push('apac');
  if (lower.includes('australia') || lower.includes('australian')) tags.push('australia');
  if (lower.includes('singapore')) tags.push('singapore');
  if (lower.includes('japan')) tags.push('japan');
  if (lower.includes('korea')) tags.push('korea');
  
  // Priority
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('immediately')) tags.push('urgent');
  if (lower.includes('important') || lower.includes('critical')) tags.push('important');
  
  return [...new Set(tags)];
}

// Generate a title from content
export function generateTitle(text: string, type: StructuredMemory['type']): string {
  const contacts = extractContacts(text);
  const lower = text.toLowerCase();
  
  // Try to extract what the meeting/call was about
  const aboutMatch = text.match(/(?:about|regarding|discussing|on)\s+(.+?)(?:\.|,|with)/i);
  const topic = aboutMatch?.[1]?.trim();
  
  switch (type) {
    case 'meeting':
      if (contacts.length > 0 && topic) {
        return `Meeting with ${contacts[0]} - ${topic}`;
      }
      if (contacts.length > 0) {
        return `Meeting with ${contacts[0]}`;
      }
      return 'Meeting Notes';
      
    case 'call':
      if (contacts.length > 0) {
        return `Call with ${contacts[0]}`;
      }
      return 'Phone Call';
      
    case 'reminder':
      // Extract what to remember
      const rememberMatch = text.match(/(?:remember to|don't forget to|remind me to)\s+(.+?)(?:\.|,|$)/i);
      if (rememberMatch) {
        return `Reminder: ${rememberMatch[1].substring(0, 50)}`;
      }
      return 'Reminder';
      
    case 'idea':
      const ideaMatch = text.match(/(?:idea:|what if|maybe we could)\s+(.+?)(?:\.|,|$)/i);
      if (ideaMatch) {
        return `Idea: ${ideaMatch[1].substring(0, 50)}`;
      }
      return 'Quick Idea';
      
    default:
      // Take first meaningful phrase
      const firstSentence = text.split(/[.!?]/)[0];
      if (firstSentence && firstSentence.length < 60) {
        return firstSentence;
      }
      return 'Quick Note';
  }
}

// Structure raw transcript into formatted memory
export function structureTranscript(transcript: string): StructuredMemory {
  const type = detectMemoryType(transcript);
  const contacts = extractContacts(transcript);
  const actionItems = extractVoiceActionItems(transcript);
  const keyPoints = extractKeyPoints(transcript);
  const tags = suggestVoiceTags(transcript);
  const title = generateTitle(transcript, type);
  
  // Generate summary (first 2 sentences or 200 chars)
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const summary = sentences.slice(0, 2).join('. ').trim();
  
  return {
    title,
    type,
    summary: summary.length > 200 ? summary.substring(0, 200) + '...' : summary,
    attendees: contacts,
    keyPoints,
    actionItems,
    tags,
    contacts,
    rawTranscript: transcript,
  };
}

// Convert structured memory to markdown
export function toMarkdown(structured: StructuredMemory, date: string): string {
  const lines: string[] = [];
  
  lines.push(`# ${date}`);
  lines.push('');
  lines.push(`**${structured.title}**`);
  lines.push('');
  
  // Type badge
  const typeEmoji = {
    meeting: '📅',
    call: '📞',
    note: '📝',
    idea: '💡',
    reminder: '⏰',
  };
  lines.push(`${typeEmoji[structured.type]} ${structured.type.charAt(0).toUpperCase() + structured.type.slice(1)}`);
  lines.push('');
  
  // Summary
  if (structured.summary) {
    lines.push('## Summary');
    lines.push(structured.summary);
    lines.push('');
  }
  
  // Attendees/Contacts
  if (structured.attendees.length > 0) {
    lines.push('## People');
    lines.push(structured.attendees.map(a => `- @${a}`).join('\n'));
    lines.push('');
  }
  
  // Key Points
  if (structured.keyPoints.length > 0) {
    lines.push('## Key Points');
    lines.push(structured.keyPoints.map(p => `- ${p}`).join('\n'));
    lines.push('');
  }
  
  // Action Items
  if (structured.actionItems.length > 0) {
    lines.push('## Action Items');
    lines.push(structured.actionItems.map(item => {
      let text = `- [ ] ${item.text}`;
      if (item.assignee) text += ` (@${item.assignee})`;
      if (item.dueDate) text += ` - by ${item.dueDate}`;
      return text;
    }).join('\n'));
    lines.push('');
  }
  
  // Tags
  if (structured.tags.length > 0) {
    lines.push('## Tags');
    lines.push(structured.tags.map(t => `#${t}`).join(' '));
    lines.push('');
  }
  
  // Raw transcript (collapsed)
  lines.push('<details>');
  lines.push('<summary>📝 Full Transcript</summary>');
  lines.push('');
  lines.push(structured.rawTranscript);
  lines.push('');
  lines.push('</details>');
  
  return lines.join('\n');
}
