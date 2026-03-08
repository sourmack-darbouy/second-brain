'use client';

import { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { DropdownMenu } from '@/components/DropdownMenu';

// Dynamic imports for client-only components
const VoiceCapture = dynamic(() => import('@/components/VoiceCapture'), { ssr: false });
const MemoryTimeline = dynamic(() => import('@/components/MemoryTimeline'), { ssr: false });
const SummaryView = dynamic(() => import('@/components/SummaryView'), { ssr: false });
const AdvancedSearch = dynamic(() => import('@/components/AdvancedSearch'), { ssr: false });
const WikiLinksPanel = dynamic(() => import('@/components/WikiLinksPanel'), { ssr: false });
const MemoryPrompts = dynamic(() => import('@/components/MemoryPrompts'), { ssr: false });

interface Memory {
  name: string;
  path: string;
  content?: string;
  lastModified: string;
  type: 'long-term' | 'daily';
  attachments?: string[];
}

interface Document {
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  emailPrimary: string;
  company?: string;
}

interface Tag {
  name: string;
  count: number;
}

interface ActionItem {
  text: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
}

// Parse mentions from content
function parseMentions(content: string): { contacts: string[]; tags: string[] } {
  if (!content) return { contacts: [], tags: [] };
  
  const contactRegex = /@([A-Z][a-zA-Z]+\s?[A-Z]?[a-zA-Z]*)/g;
  const tagRegex = /#([a-zA-Z0-9_-]+)/g;
  
  const contacts: string[] = [];
  const tags: string[] = [];
  
  let match;
  while ((match = contactRegex.exec(content)) !== null) {
    contacts.push(match[1].trim());
  }
  while ((match = tagRegex.exec(content)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  
  return { contacts: [...new Set(contacts)], tags: [...new Set(tags)] };
}

// Extract action items
function extractActionItems(content: string): ActionItem[] {
  if (!content) return [];
  const items: ActionItem[] = [];
  const checkboxRegex = /[-*]?\s*\[\s*\]\s*(.+)/g;
  
  let match;
  while ((match = checkboxRegex.exec(content)) !== null) {
    let text = match[1].trim();
    let priority: 'high' | 'medium' | 'low' = 'medium';
    
    if (text.includes('!!!') || text.toLowerCase().includes('urgent')) {
      priority = 'high';
      text = text.replace(/!!!/g, '').replace(/urgent:?/gi, '').trim();
    }
    
    const dateMatch = text.match(/by\s+(.+?)(?:\s*$|[,;])/i);
    items.push({
      text: text.replace(dateMatch?.[0] || '', '').trim(),
      dueDate: dateMatch?.[1]?.trim(),
      priority,
    });
  }
  
  return items;
}

// Render content with clickable mentions
function renderContent(
  content: string,
  contacts: Contact[],
  onTagClick: (tag: string) => void,
  onContactClick: (name: string) => void
): string {
  if (!content) return '';
  
  let rendered = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert @Mentions
  rendered = rendered.replace(
    /@([A-Z][a-zA-Z]+\s?[A-Z]?[a-zA-Z]*)/g,
    (match, name) => {
      const contact = contacts.find(
        c => `${c.firstName} ${c.lastName}`.toLowerCase() === name.toLowerCase()
      );
      if (contact) {
        return `<span class="text-blue-400 bg-blue-900/30 px-1 rounded cursor-pointer hover:bg-blue-800/50" data-contact="${contact.id}">@${name}</span>`;
      }
      return `<span class="text-yellow-400 bg-yellow-900/30 px-1 rounded">@${name}</span>`;
    }
  );

  // Convert #tags
  rendered = rendered.replace(
    /#([a-zA-Z0-9_-]+)/g,
    (match, tag) =>
      `<span class="text-purple-400 bg-purple-900/30 px-1 rounded cursor-pointer hover:bg-purple-800/50" data-tag="${tag}">#${tag}</span>`
  );

  // Convert [[Wiki Links]]
  rendered = rendered.replace(
    /\[\[([^\]]+)\]\]/g,
    (match, link) =>
      `<span class="text-green-400 bg-green-900/30 px-1 rounded cursor-pointer hover:bg-green-800/50" data-link="${link}">[[${link}]]</span>`
  );

  return rendered.replace(/\n/g, '<br/>');
}

// Tag colors
const TAG_COLORS: Record<string, string> = {
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

function MemoriesContent() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  
  const [memories, setMemories] = useState<Memory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [memoryAttachments, setMemoryAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // New feature states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterContact, setFilterContact] = useState<string | null>(null);
  const [showTagSidebar, setShowTagSidebar] = useState(true);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [showActionItems, setShowActionItems] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');
  
  // Voice capture
  const [showVoiceCapture, setShowVoiceCapture] = useState(false);
  
  // Timeline view
  const [showTimeline, setShowTimeline] = useState(false);
  
  // Summary view
  const [showSummary, setShowSummary] = useState(false);
  
  // Advanced search
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  // Memory prompts
  const [showPrompts, setShowPrompts] = useState(false);
  
  // Autosave state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch memory list (lightweight - no content)
  const fetchMemoryList = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch memories list (light mode - fast)
      const memoriesRes = await fetch('/api/memories');
      const memoriesData = await memoriesRes.json();
      
      // Set memories WITHOUT content (light mode)
      setMemories(memoriesData.memories || []);
      
      // Fetch other data (skip tags - too slow with 396 memories)
      const [docsRes, contactsRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/contacts'),
      ]);

      const docsData = await docsRes.json();
      const contactsData = await contactsRes.json();

      setDocuments(docsData.documents || []);
      setContacts(contactsData.contacts || []);
      // Tags loaded lazily from content when needed
      setTags([]);

      // Handle URL params
      const filePath = searchParams.get('file');
      const tagFilter = searchParams.get('tag');
      const contactFilter = searchParams.get('contact');

      if (tagFilter) setFilterTag(tagFilter);
      if (contactFilter) setFilterContact(contactFilter);

      // Select first memory but don't load content yet
      if (filePath) {
        const mem = (memoriesData.memories || []).find((m: Memory) => m.path === filePath);
        if (mem) {
          setSelectedMemory(mem);
        }
      } else if (memoriesData.memories?.length > 0) {
        setSelectedMemory(memoriesData.memories[0]);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // Load content for selected memory on demand
  const loadMemoryContent = useCallback(async (memory: Memory) => {
    if (memory.content) return; // Already loaded
    
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/memories/content?path=${encodeURIComponent(memory.path)}`);
      const data = await res.json();
      
      if (data.content !== undefined) {
        // Update memory with content
        setMemories(prev => prev.map(m => 
          m.path === memory.path ? { ...m, content: data.content, attachments: data.attachments } : m
        ));
        
        setSelectedMemory(prev => 
          prev?.path === memory.path ? { ...prev, content: data.content, attachments: data.attachments } : prev
        );
        setEditContent(data.content || '');
        setMemoryAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error('Failed to load memory content:', error);
    } finally {
      setLoadingContent(false);
    }
  }, []);

  useEffect(() => {
    fetchMemoryList();
  }, [fetchMemoryList]);

  // Load content when memory is selected
  useEffect(() => {
    if (selectedMemory && !selectedMemory.content) {
      loadMemoryContent(selectedMemory);
    } else if (selectedMemory) {
      setEditContent(selectedMemory.content || '');
      setMemoryAttachments(selectedMemory.attachments || []);
    }
  }, [selectedMemory?.path]);

  // Filter memories based on search and filters (only by name/path since no content in light mode)
  const filteredMemories = memories.filter(mem => {
    if (filterTag || filterContact) {
      // For tag/contact filtering, we need content - skip filter in light mode
      // Tags will be filtered client-side when content is loaded
      return true;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!mem.name.toLowerCase().includes(q) && !mem.path.toLowerCase().includes(q)) {
        // Also search in content if loaded
        if (mem.content && !mem.content.toLowerCase().includes(q)) {
          return false;
        } else if (!mem.content) {
          return true; // Include if content not loaded yet
        }
      }
    }
    if (dateFilter !== 'all') {
      const memDate = new Date(mem.lastModified);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (dateFilter === 'week' && memDate < weekAgo) return false;
      if (dateFilter === 'month' && memDate < monthAgo) return false;
    }
    return true;
  });

  // Extract action items when memory changes
  useEffect(() => {
    if (selectedMemory?.content) {
      setActionItems(extractActionItems(selectedMemory.content));
    }
  }, [selectedMemory?.content]);

  // Get tag suggestions when editing
  useEffect(() => {
    if (editing && editContent) {
      const { tags: existingTags } = parseMentions(editContent);
      const suggestions: string[] = [];
      const lower = editContent.toLowerCase();

      if (lower.includes('tender') || lower.includes('rfp')) suggestions.push('tender');
      if (lower.includes('partner')) suggestions.push('partner');
      if (lower.includes('deal') || lower.includes('contract')) suggestions.push('deal');
      if (lower.includes('follow up') || lower.includes('follow-up')) suggestions.push('follow-up');
      if (lower.includes('meeting') || lower.includes('call')) suggestions.push('meeting');
      if (lower.includes('quote') || lower.includes('pricing')) suggestions.push('pricing');
      if (lower.includes('lorawan')) suggestions.push('lorawan');
      if (lower.includes('iot')) suggestions.push('iot');

      setSuggestedTags(suggestions.filter(t => !existingTags.includes(t)));
    }
  }, [editing, editContent]);

  // Handle @mention autocomplete
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart;
    setEditContent(value);
    setCursorPosition(pos);

    // Check if we're typing a mention
    const beforeCursor = value.substring(0, pos);
    const mentionMatch = beforeCursor.match(/@([A-Za-z]*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionDropdown(true);
      
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left,
        });
      }
    } else {
      setShowMentionDropdown(false);
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    autosaveTimeoutRef.current = setTimeout(() => {
      if (editing && editContent.trim() && selectedMemory) {
        performAutosave();
      }
    }, 2000);
  };

  // Autosave function
  const performAutosave = async () => {
    if (!selectedMemory || !editContent.trim() || saving) return;
    
    setIsSaving(true);
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedMemory.path,
          content: editContent,
          type: selectedMemory.type,
          attachments: memoryAttachments,
        }),
      });

      setSelectedMemory({ ...selectedMemory, content: editContent, attachments: memoryAttachments });
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to autosave:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Insert mention
  const insertMention = (contact: Contact) => {
    if (!textareaRef.current) return;

    const beforeMention = editContent.substring(0, cursorPosition - mentionQuery.length - 1);
    const afterCursor = editContent.substring(cursorPosition);
    const mention = `@${contact.firstName}${contact.lastName ? ' ' + contact.lastName : ''}`;
    
    const newContent = beforeMention + mention + ' ' + afterCursor;
    setEditContent(newContent);
    setShowMentionDropdown(false);

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = beforeMention.length + mention.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  // Insert tag
  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;

    const newContent = editContent + ` #${tag} `;
    setEditContent(newContent);
    setSuggestedTags(prev => prev.filter(t => t !== tag));

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newContent.length, newContent.length);
      }
    }, 0);
  };

  const selectMemory = (mem: Memory) => {
    setSelectedMemory(mem);
    setEditing(false);
    setShowSidebar(false);
    setViewMode('preview');
  };

  const saveMemory = async () => {
    if (!selectedMemory || !editContent.trim()) return;

    setSaving(true);
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedMemory.path,
          content: editContent,
          type: selectedMemory.type,
          attachments: memoryAttachments,
        }),
      });

      setSelectedMemory({ ...selectedMemory, content: editContent, attachments: memoryAttachments });
      setEditing(false);
      fetchMemoryList();
    } catch (error) {
      console.error('Failed to save memory:', error);
    } finally {
      setSaving(false);
    }
  };

  const createDailyNote = async () => {
    const today = new Date().toISOString().split('T')[0];
    const exists = memories.some(m => m.path === `memory/${today}.md`);

    if (exists) {
      alert('Today\'s note already exists');
      return;
    }

    const template = `# ${today}

## Meetings
<!-- Use @Name to mention contacts -->

## Notes
<!-- Use #tags to organize -->

## Action Items
- [ ] 

## Links
`;

    const newMemory = {
      path: `memory/${today}.md`,
      content: template,
      type: 'daily' as const,
    };

    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemory),
      });

      fetchMemoryList();
    } catch (error) {
      console.error('Failed to create daily note:', error);
    }
  };

  const deleteMemory = async () => {
    if (!selectedMemory) return;

    if (selectedMemory.type === 'long-term') {
      alert('Cannot delete long-term memory');
      return;
    }

    if (!confirm(`Delete memory "${selectedMemory.name}"? This cannot be undone.`)) return;

    try {
      await fetch('/api/memories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedMemory.path }),
      });

      setSelectedMemory(null);
      fetchMemoryList();
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const toggleAttachment = async (docPath: string) => {
    const isAttached = memoryAttachments.includes(docPath);
    const newAttachments = isAttached
      ? memoryAttachments.filter(p => p !== docPath)
      : [...memoryAttachments, docPath];

    setMemoryAttachments(newAttachments);

    try {
      await fetch('/api/memories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memoryPath: selectedMemory?.path,
          documentPath: docPath,
          action: isAttached ? 'detach' : 'attach',
        }),
      });
    } catch (error) {
      console.error('Failed to update attachment:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const reader = new FileReader();

      reader.onload = async (event) => {
        const result = event.target?.result;
        if (!result) return;

        const isBinary = !file.name.match(/\.(md|txt|json|csv|yaml|yml|js|ts|tsx|jsx|py|html|css|xml)$/i);

        let content: string;
        if (isBinary) {
          content = (result as string).split(',')[1];
        } else {
          content = result as string;
        }

        try {
          const res = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              path: file.name,
              content,
              isBase64: isBinary,
            }),
          });

          if (res.ok) {
            await fetchMemoryList();
            await toggleAttachment(file.name);
          } else {
            alert('Failed to upload document');
          }
        } catch (error) {
          console.error('Upload error:', error);
          alert('Failed to upload file');
        }

        setUploading(false);
      };

      if (file.name.match(/\.(md|txt|json|csv|yaml|yml|js|ts|tsx|jsx|py|html|css|xml)$/i)) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter contacts for mention dropdown
  const filteredContacts = contacts.filter(c => {
    if (!mentionQuery) return true;
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    return name.includes(mentionQuery.toLowerCase());
  });

  // Handle rendered content clicks
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    if (target.dataset.tag) {
      setFilterTag(target.dataset.tag);
    } else if (target.dataset.contact) {
      window.location.href = `/contacts?highlight=${target.dataset.contact}`;
    } else if (target.dataset.link) {
      setSearchQuery(target.dataset.link);
    }
  };

  if (loading) {
    return <div className="text-zinc-400">Loading memories...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mention Autocomplete Dropdown */}
      {showMentionDropdown && editing && (
        <div
          ref={mentionDropdownRef}
          className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-auto w-64"
          style={{ top: mentionPosition.top, left: mentionPosition.left }}
        >
          <div className="p-2 text-xs text-zinc-400 border-b border-zinc-700">
            Select contact...
          </div>
          {filteredContacts.length === 0 ? (
            <div className="p-3 text-zinc-500 text-sm">No contacts found</div>
          ) : (
            filteredContacts.slice(0, 5).map(contact => (
              <button
                key={contact.id}
                onClick={() => insertMention(contact)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-700 flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-zinc-600 rounded-full flex items-center justify-center text-sm">
                  {contact.firstName[0]}{contact.lastName?.[0]}
                </div>
                <div>
                  <div className="text-sm">{contact.firstName} {contact.lastName}</div>
                  <div className="text-xs text-zinc-400">{contact.company || contact.emailPrimary}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Attach Document Modal */}
      {showAttachModal && selectedMemory && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[80vh] overflow-auto border border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Attach Documents</h3>
              <button onClick={() => setShowAttachModal(false)} className="text-zinc-400 hover:text-white p-2">✕</button>
            </div>

            <div className="mb-4 p-4 border-2 border-dashed border-zinc-700 rounded-lg hover:border-zinc-500 transition">
              <input ref={fileInputRef} type="file" accept="*" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className={`flex flex-col items-center justify-center cursor-pointer py-4 ${uploading ? 'opacity-50' : ''}`}>
                {uploading ? <span className="text-zinc-400">Uploading...</span> : (
                  <>
                    <span className="text-3xl mb-2">📤</span>
                    <span className="text-zinc-400 text-sm text-center">Click to upload</span>
                  </>
                )}
              </label>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-auto">
              {documents.map(doc => {
                const isAttached = memoryAttachments.includes(doc.path);
                return (
                  <button
                    key={doc.path}
                    onClick={() => toggleAttachment(doc.path)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center justify-between gap-3 ${
                      isAttached ? 'bg-blue-600/20 border border-blue-500 text-blue-300' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{isAttached ? '✓' : '📄'}</span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{doc.name}</div>
                        <div className="text-xs text-zinc-500">{doc.type} • {formatSize(doc.size)}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-700 flex justify-end gap-2">
              <button onClick={() => setShowAttachModal(false)} className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-sm">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold">Memories</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={createDailyNote} className="bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm">
            + Today
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 pl-10"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
        </div>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as 'all' | 'week' | 'month')}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100"
        >
          <option value="all">All Time</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Memory List */}
        <div className={`
          bg-zinc-900 rounded-lg p-3 sm:p-4 border border-zinc-800
          fixed inset-0 z-40 bg-zinc-950/95 lg:bg-transparent lg:static lg:z-auto
          ${showSidebar ? 'block' : 'hidden lg:block'}
        `}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-zinc-300 text-sm">
              📅 Memories ({filteredMemories.length})
            </h3>
            <button onClick={() => setShowSidebar(false)} className="lg:hidden text-zinc-400 p-2">✕</button>
          </div>
          
          {filteredMemories.length === 0 ? (
            <p className="text-zinc-500 text-sm">No memories found.</p>
          ) : (
            <div className="space-y-1 max-h-[60vh] lg:max-h-[70vh] overflow-auto">
              {filteredMemories.map(mem => (
                <button
                  key={mem.path}
                  onClick={() => selectMemory(mem)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
                    selectedMemory?.path === mem.path ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{mem.type === 'long-term' ? '🧠' : '📅'}</span>
                    <span className="truncate flex-1">{mem.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Editor */}
        <div className="lg:col-span-2 bg-zinc-900 rounded-lg p-3 sm:p-6 border border-zinc-800">
          {selectedMemory ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                <h3 className="text-lg sm:text-xl font-semibold">{selectedMemory.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-400 text-xs hidden sm:block">
                    {new Date(selectedMemory.lastModified).toLocaleString()}
                  </span>

                  {!editing ? (
                    <>
                      <button onClick={() => setViewMode(viewMode === 'preview' ? 'source' : 'preview')} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-400 text-sm">
                        {viewMode === 'preview' ? '📝 Source' : '👁️ Preview'}
                      </button>
                      <button onClick={() => setEditing(true)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-blue-400 text-sm">Edit</button>
                      {selectedMemory.type !== 'long-term' && (
                        <button onClick={deleteMemory} className="bg-zinc-800 hover:bg-red-900 px-3 py-1.5 rounded-lg text-red-400 text-sm">Delete</button>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditing(false); setEditContent(selectedMemory.content || ''); }} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-400 text-sm">Cancel</button>
                      <button onClick={saveMemory} disabled={saving} className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-white text-sm">
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {loadingContent ? (
                <div className="text-zinc-400 py-12 text-center">
                  <div className="animate-pulse">Loading content...</div>
                </div>
              ) : editing ? (
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={editContent}
                    onChange={handleTextareaChange}
                    placeholder={`# ${selectedMemory.name}\n\nUse @Name to mention contacts\nUse #tags to organize\nUse [[Title]] for wiki links`}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 sm:p-4 text-zinc-300 font-mono text-sm min-h-[50vh] sm:min-h-[60vh]"
                  />
                </div>
              ) : viewMode === 'preview' ? (
                <div
                  onClick={handleContentClick}
                  className="whitespace-pre-wrap text-zinc-300 text-sm bg-zinc-950 p-3 sm:p-4 rounded-lg border border-zinc-800 overflow-auto max-h-[60vh] sm:max-h-[70vh]"
                  dangerouslySetInnerHTML={{ __html: renderContent(selectedMemory.content || '', contacts, () => {}, () => {}) }}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-zinc-300 font-mono text-sm bg-zinc-950 p-3 sm:p-4 rounded-lg border border-zinc-800 overflow-auto max-h-[60vh] sm:max-h-[70vh]">
                  {selectedMemory.content || '(empty)'}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-zinc-400 text-center py-8 sm:py-12">
              Select a memory from the list.
            </div>
          )}
        </div>
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="sm:hidden fixed bottom-24 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg z-50"
      >
        📂
      </button>
    </div>
  );
}

export default function MemoriesPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400">Loading memories...</div>}>
      <MemoriesContent />
    </Suspense>
  );
}
