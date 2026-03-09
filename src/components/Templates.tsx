'use client';

import { useState } from 'react';

interface Template {
  id: string;
  name: string;
  icon: string;
  content: string;
}

export const MEMORY_TEMPLATES: Template[] = [
  {
    id: 'meeting',
    name: 'Meeting',
    icon: '📅',
    content: `## Meeting with [[]]

**Date:** {{date}}
**Attendees:** @Name1, @Name2
**Company:** [[]]

### Discussion
- 

### Action Items
- [ ] 

### Next Steps
- 
`,
  },
  {
    id: 'call',
    name: 'Call',
    icon: '📞',
    content: `## Call with [[]]

**Time:** {{time}}
**Contact:** @Name

### Notes
- 

### Follow-up
- [ ] 
`,
  },
  {
    id: 'discovery',
    name: 'Discovery',
    icon: '🔍',
    content: `## Discovery Call - [[]]

**Company:** [[]]
**Contact:** @Name, @Title
**Date:** {{date}}

### Company Background
- Industry: 
- Size: 
- Location: 

### Current Situation
- 

### Pain Points
- 

### Opportunity
- 

### Next Steps
- [ ] 
`,
  },
  {
    id: 'followup',
    name: 'Follow-up',
    icon: '✉️',
    content: `## Follow-up with [[]]

**Last Contact:** 
**Action Required:** 

### Status
- 

### Tasks
- [ ] Send proposal
- [ ] Schedule demo
- [ ] 

### Notes
- 
`,
  },
  {
    id: 'tender',
    name: 'Tender',
    icon: '📋',
    content: `## Tender - [[]]

**Due Date:** 
**Value:** 
**Status:** #tender

### Requirements
- 

### Our Solution
- 

### Competition
- 

### Action Items
- [ ] Review requirements
- [ ] Prepare response
- [ ] Submit by deadline

### Notes
- 
`,
  },
  {
    id: 'demo',
    name: 'Demo',
    icon: '🖥️',
    content: `## Demo - [[]]

**Date:** {{date}}
**Time:** {{time}}
**Attendees:** @Name1, @Name2

### Agenda
1. Introduction
2. 
3. Q&A

### Key Points to Cover
- 

### Questions Asked
- 

### Feedback
- 

### Next Steps
- [ ] 
`,
  },
];

interface TemplateSelectorProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

export function TemplateSelector({ onSelect, onClose }: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = MEMORY_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-zinc-900 rounded-t-2xl sm:rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden border border-zinc-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-semibold">Choose Template</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-2">✕</button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-800">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white"
          />
        </div>

        {/* Swipe indicator for mobile */}
        <div className="swipe-indicator sm:hidden" />

        {/* Templates */}
        <div className="overflow-auto max-h-[50vh] p-4 space-y-2">
          {filteredTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="w-full text-left p-4 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-lg transition flex items-center gap-3"
            >
              <span className="text-2xl">{template.icon}</span>
              <div>
                <div className="font-medium">{template.name}</div>
                <div className="text-xs text-zinc-400">Pre-formatted template</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper to replace template variables
export function processTemplate(content: string): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return content
    .replace(/\{\{date\}\}/g, date)
    .replace(/\{\{time\}\}/g, time);
}
