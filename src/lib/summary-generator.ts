// AI Summary generation utilities

export interface WeeklySummary {
  period: {
    start: string;
    end: string;
  };
  totalMemories: number;
  totalWords: number;
  topContacts: { name: string; count: number }[];
  topTags: { name: string; count: number }[];
  topCompanies: { name: string; count: number }[];
  actionItems: {
    total: number;
    completed: number;
    pending: { text: string; memory: string }[];
  };
  keyTopics: string[];
  meetings: { date: string; contacts: string[]; summary: string }[];
  deals: { company: string; status: string; notes: string }[];
  generated: string;
}

export interface MonthlySummary extends WeeklySummary {
  weeks: WeeklySummary[];
  trends: {
    memoriesChange: number;
    contactsChange: number;
    activityScore: number;
  };
}

// Generate weekly summary from memories
export function generateWeeklySummary(
  memories: { name: string; path: string; content: string; lastModified: string }[]
): WeeklySummary {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Filter memories from last week
  const weekMemories = memories.filter(m => new Date(m.lastModified) >= weekAgo);
  
  // Extract all contacts, tags, companies
  const contactCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  const companyCounts: Record<string, number> = {};
  const actionItems: { text: string; memory: string }[] = [];
  const meetings: { date: string; contacts: string[]; summary: string }[] = [];
  const deals: { company: string; status: string; notes: string }[] = [];
  
  let totalWords = 0;
  
  for (const memory of weekMemories) {
    totalWords += memory.content.split(/\s+/).length;
    
    // Extract contacts
    const contactMatches = memory.content.match(/@([A-Z][a-zA-Z]+\s?[A-Z]?[a-zA-Z]*)/g) || [];
    for (const contact of contactMatches) {
      const name = contact.replace('@', '');
      contactCounts[name] = (contactCounts[name] || 0) + 1;
    }
    
    // Extract tags
    const tagMatches = memory.content.match(/#([a-zA-Z0-9_-]+)/g) || [];
    for (const tag of tagMatches) {
      const name = tag.replace('#', '').toLowerCase();
      tagCounts[name] = (tagCounts[name] || 0) + 1;
    }
    
    // Extract companies (capitalized words near company keywords)
    const companyPatterns = [
      /(?:company|from|at|with)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z]?[a-z]+)?)/g,
      /([A-Z][a-zA-Z]+(?:\s+[A-Z]?[a-z]+)?)\s+(?:Inc|LLC|Ltd|Corp|Pty|GmbH)/gi,
    ];
    for (const pattern of companyPatterns) {
      let match;
      while ((match = pattern.exec(memory.content)) !== null) {
        const company = match[1].trim();
        if (company.length > 2 && !['The', 'This', 'That', 'Meeting', 'Call'].includes(company)) {
          companyCounts[company] = (companyCounts[company] || 0) + 1;
        }
      }
    }
    
    // Extract action items
    const actionMatches = memory.content.match(/[-*]\s*\[\s*\]\s*(.+)/g) || [];
    for (const action of actionMatches) {
      actionItems.push({
        text: action.replace(/[-*]\s*\[\s*\]\s*/, '').trim(),
        memory: memory.name,
      });
    }
    
    // Detect meetings
    if (memory.content.toLowerCase().includes('meeting') || memory.content.toLowerCase().includes('call with')) {
      const meetingContacts = contactMatches.map(c => c.replace('@', ''));
      const summary = memory.content.split('\n')[0].replace(/[#*@]/g, '').trim().substring(0, 100);
      meetings.push({
        date: memory.name,
        contacts: meetingContacts,
        summary,
      });
    }
    
    // Detect deals
    const lower = memory.content.toLowerCase();
    if (lower.includes('deal') || lower.includes('contract') || lower.includes('proposal') || lower.includes('tender')) {
      const companies = Object.keys(companyCounts);
      if (companies.length > 0) {
        let status = 'In Progress';
        if (lower.includes('won') || lower.includes('signed') || lower.includes('closed')) status = 'Won';
        if (lower.includes('lost') || lower.includes('declined')) status = 'Lost';
        if (lower.includes('submitted')) status = 'Submitted';
        
        deals.push({
          company: companies[0],
          status,
          notes: memory.content.split('\n')[0].substring(0, 100),
        });
      }
    }
  }
  
  // Sort and limit
  const topContacts = Object.entries(contactCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  const topTags = Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const topCompanies = Object.entries(companyCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Extract key topics from tags
  const keyTopics = topTags.slice(0, 5).map(t => t.name);
  
  return {
    period: {
      start: weekAgo.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    },
    totalMemories: weekMemories.length,
    totalWords,
    topContacts,
    topTags,
    topCompanies,
    actionItems: {
      total: actionItems.length,
      completed: 0, // Would need to track completion
      pending: actionItems.slice(0, 10),
    },
    keyTopics,
    meetings,
    deals,
    generated: now.toISOString(),
  };
}

// Format summary as markdown
export function formatSummaryMarkdown(summary: WeeklySummary, title: string): string {
  const lines: string[] = [];
  
  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`**Period:** ${summary.period.start} to ${summary.period.end}`);
  lines.push('');
  
  // Stats
  lines.push('## 📊 Quick Stats');
  lines.push('');
  lines.push(`- **${summary.totalMemories}** memories captured`);
  lines.push(`- **${summary.totalWords}** words written`);
  lines.push(`- **${summary.actionItems.total}** action items`);
  lines.push(`- **${summary.meetings.length}** meetings/calls`);
  lines.push('');
  
  // Top Contacts
  if (summary.topContacts.length > 0) {
    lines.push('## 👥 Top Contacts');
    lines.push('');
    for (const contact of summary.topContacts) {
      lines.push(`- @${contact.name} (${contact.count} mentions)`);
    }
    lines.push('');
  }
  
  // Top Tags
  if (summary.topTags.length > 0) {
    lines.push('## 🏷️ Top Tags');
    lines.push('');
    lines.push(summary.topTags.map(t => `#${t.name}`).join(' '));
    lines.push('');
  }
  
  // Companies
  if (summary.topCompanies.length > 0) {
    lines.push('## 🏢 Companies Mentioned');
    lines.push('');
    for (const company of summary.topCompanies) {
      lines.push(`- ${company.name} (${company.count})`);
    }
    lines.push('');
  }
  
  // Meetings
  if (summary.meetings.length > 0) {
    lines.push('## 📅 Meetings & Calls');
    lines.push('');
    for (const meeting of summary.meetings) {
      lines.push(`- **${meeting.date}**: ${meeting.contacts.length > 0 ? meeting.contacts.map(c => `@${c}`).join(', ') : meeting.summary}`);
    }
    lines.push('');
  }
  
  // Deals
  if (summary.deals.length > 0) {
    lines.push('## 💼 Deals & Opportunities');
    lines.push('');
    for (const deal of summary.deals) {
      const statusEmoji = deal.status === 'Won' ? '✅' : deal.status === 'Lost' ? '❌' : '🔄';
      lines.push(`- ${statusEmoji} **${deal.company}** - ${deal.status}`);
    }
    lines.push('');
  }
  
  // Pending Actions
  if (summary.actionItems.pending.length > 0) {
    lines.push('## ✅ Pending Action Items');
    lines.push('');
    for (const item of summary.actionItems.pending) {
      lines.push(`- [ ] ${item.text} _(${item.memory})_`);
    }
    lines.push('');
  }
  
  // Footer
  lines.push('---');
  lines.push(`_Generated on ${new Date(summary.generated).toLocaleString()}_`);
  
  return lines.join('\n');
}

// Format summary as plain text (for Telegram/email)
export function formatSummaryText(summary: WeeklySummary, title: string): string {
  const lines: string[] = [];
  
  lines.push(`📊 *${title}*`);
  lines.push(`_${summary.period.start} to ${summary.period.end}_`);
  lines.push('');
  
  lines.push(`📝 ${summary.totalMemories} memories • ${summary.totalWords} words`);
  lines.push(`📋 ${summary.actionItems.total} action items • ${summary.meetings.length} meetings`);
  lines.push('');
  
  if (summary.topContacts.length > 0) {
    lines.push(`👥 *Top Contacts:*`);
    lines.push(summary.topContacts.map(c => `@${c.name}`).join(', '));
    lines.push('');
  }
  
  if (summary.topTags.length > 0) {
    lines.push(`🏷️ *Top Tags:*`);
    lines.push(summary.topTags.slice(0, 5).map(t => `#${t.name}`).join(' '));
    lines.push('');
  }
  
  if (summary.meetings.length > 0) {
    lines.push(`📅 *Recent Meetings:*`);
    for (const meeting of summary.meetings.slice(0, 3)) {
      lines.push(`• ${meeting.date}: ${meeting.contacts[0] || 'Meeting'}`);
    }
    lines.push('');
  }
  
  if (summary.actionItems.pending.length > 0) {
    lines.push(`✅ *Pending Actions:*`);
    for (const item of summary.actionItems.pending.slice(0, 5)) {
      lines.push(`• ${item.text}`);
    }
  }
  
  return lines.join('\n');
}
