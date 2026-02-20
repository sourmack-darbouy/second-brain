'use client';

import { useEffect, useState, useRef, Suspense } from 'react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  emailPrimary: string;
  emailSecondary?: string;
  phoneMobile?: string;
  phoneWork?: string;
  phoneDirect?: string;
  company?: string;
  jobTitle?: string;
  photoUrl?: string;
  linkedInUrl?: string;
  companyWebsite?: string;
  industry?: string;
  city?: string;
  country?: string;
  department?: string;
  howMet?: string;
  leadSource?: string;
  relationshipStrength?: 'hot' | 'warm' | 'cold';
  tags: string[];
  notes?: string;
  source: 'manual' | 'business_card' | 'qr_code' | 'vcard_import' | 'email_signature';
  status: 'active' | 'archived' | 'duplicate';
  createdAt: string;
  updatedAt: string;
  lastContacted?: string;
  nextFollowUp?: string;
  preferredContactMethod?: 'email' | 'phone' | 'linkedin' | 'whatsapp';
  doNotContact: boolean;
}

const HOW_MET_OPTIONS = [
  'Conference', 'Referral', 'Cold Outreach', 'Partner', 'Customer', 
  'Vendor', 'Social Media', 'Website', 'Trade Show', 'Other'
];

const TAG_OPTIONS = [
  'Prospect', 'Customer', 'Partner', 'Vendor', 'Investor', 
  'Press', 'APAC', 'IoT', 'LoRaWAN', 'Follow-up', 'Hot Lead'
];

function ContactsContent() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'card' | 'qr'>('card');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ duplicates: { field: string; contact: Contact }[]; data: any } | null>(null);
  const [bulkContacts, setBulkContacts] = useState<Partial<Contact>[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, duplicates: 0 });
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);

  const importBulkContacts = async () => {
    setBulkImporting(true);
    setBulkProgress({ done: 0, total: bulkContacts.length, duplicates: 0 });
    
    let imported = 0;
    let duplicates = 0;
    
    for (const contact of bulkContacts) {
      try {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...contact, forceCreate: false }),
        });
        
        const data = await res.json();
        
        if (data.duplicate) {
          duplicates++;
          // Auto-merge with existing contact
          if (data.duplicates[0]?.contact?.id) {
            await fetch('/api/contacts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...contact, id: data.duplicates[0].contact.id }),
            });
          }
        } else {
          imported++;
        }
        
        setBulkProgress({ done: imported + duplicates, total: bulkContacts.length, duplicates });
      } catch (error) {
        console.error('Failed to import contact:', error);
      }
    }
    
    setBulkImporting(false);
    setShowBulkImport(false);
    setBulkContacts([]);
    fetchContacts();
    
    alert(`Import complete!\n${imported} new contacts added\n${duplicates} duplicates merged/skipped`);
  };

  const toggleMergeSelect = (contactId: string) => {
    if (selectedForMerge.includes(contactId)) {
      setSelectedForMerge(selectedForMerge.filter(id => id !== contactId));
    } else {
      if (selectedForMerge.length < 2) {
        setSelectedForMerge([...selectedForMerge, contactId]);
      } else {
        // Replace the oldest selection
        setSelectedForMerge([selectedForMerge[1], contactId]);
      }
    }
  };

  const performMerge = async () => {
    if (selectedForMerge.length !== 2) return;
    
    const [primaryId, secondaryId] = selectedForMerge;
    
    try {
      const res = await fetch('/api/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryId, secondaryId }),
      });
      
      if (res.ok) {
        setSelectedForMerge([]);
        setMergeMode(false);
        setShowMergeModal(false);
        fetchContacts();
      }
    } catch (error) {
      console.error('Failed to merge contacts:', error);
    }
  };
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vcardInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<Partial<Contact>>({
    firstName: '', lastName: '', emailPrimary: '', phoneMobile: '',
    company: '', jobTitle: '', tags: [], notes: '', source: 'manual',
    relationshipStrength: 'warm', howMet: '', industry: '', city: '', country: '',
    linkedInUrl: '', companyWebsite: '', doNotContact: false,
  });

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const saveContact = async (forceCreate = false) => {
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, forceCreate }),
      });
      
      const data = await res.json();
      
      if (data.duplicate && !forceCreate) {
        setDuplicateWarning(data);
        return;
      }
      
      if (data.success) {
        setShowAddForm(false);
        setEditMode(false);
        setSelectedContact(null);
        setFormData({
          firstName: '', lastName: '', emailPrimary: '', phoneMobile: '',
          company: '', jobTitle: '', tags: [], notes: '', source: 'manual',
          relationshipStrength: 'warm', howMet: '', industry: '', city: '', country: '',
          linkedInUrl: '', companyWebsite: '', doNotContact: false,
        });
        setDuplicateWarning(null);
        fetchContacts();
      }
    } catch (error) {
      console.error('Failed to save contact:', error);
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    
    try {
      await fetch('/api/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setSelectedContact(null);
      fetchContacts();
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const mergeContacts = async (primaryId: string, secondaryId: string) => {
    try {
      await fetch('/api/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryId, secondaryId }),
      });
      setDuplicateWarning(null);
      fetchContacts();
    } catch (error) {
      console.error('Failed to merge contacts:', error);
    }
  };

  const parseCSV = (text: string): Partial<Contact>[] => {
    const contacts: Partial<Contact>[] = [];
    const lines = text.split('\n').filter(l => l.trim());
    
    if (lines.length < 2) return contacts;
    
    // Parse header
    const header = lines[0].split(',').map(h => h.toLowerCase().trim().replace(/"/g, ''));
    
    // Map common column names
    const fieldMap: Record<string, string> = {
      'first name': 'firstName', 'firstname': 'firstName', 'given name': 'firstName',
      'last name': 'lastName', 'lastname': 'lastName', 'surname': 'lastName', 'family name': 'lastName',
      'email': 'emailPrimary', 'e-mail': 'emailPrimary', 'email address': 'emailPrimary',
      'phone': 'phoneMobile', 'mobile': 'phoneMobile', 'mobile phone': 'phoneMobile', 'cell': 'phoneMobile',
      'work phone': 'phoneWork', 'business phone': 'phoneWork',
      'company': 'company', 'organization': 'company', 'organisation': 'company',
      'title': 'jobTitle', 'job title': 'jobTitle', 'position': 'jobTitle',
      'city': 'city', 'country': 'country',
      'linkedin': 'linkedInUrl', 'linkedin url': 'linkedInUrl',
      'website': 'companyWebsite', 'url': 'companyWebsite',
    };
    
    // Parse each row
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const contact: Partial<Contact> = { source: 'vcard_import', tags: [] };
      
      header.forEach((col, idx) => {
        const fieldName = fieldMap[col];
        if (fieldName && values[idx]) {
          (contact as any)[fieldName] = values[idx];
        }
      });
      
      // Only add if we have at least a name or email
      if (contact.firstName || contact.lastName || contact.emailPrimary) {
        contacts.push(contact);
      }
    }
    
    return contacts;
  };

  const parseVCard = (text: string): Partial<Contact> => {
    const contact: Partial<Contact> = { source: 'vcard_import', tags: [] };
    
    // Parse vCard fields
    const lines = text.split('\n');
    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      if (key.startsWith('FN') || key === 'FN') {
        const names = value.split(' ');
        contact.firstName = names[0] || '';
        contact.lastName = names.slice(1).join(' ') || '';
      }
      if (key.includes('EMAIL')) contact.emailPrimary = value;
      if (key.includes('TEL') && key.includes('CELL')) contact.phoneMobile = value;
      if (key.includes('TEL') && key.includes('WORK') && !contact.phoneWork) contact.phoneWork = value;
      if (key.includes('ORG')) contact.company = value.split(';')[0];
      if (key.includes('TITLE')) contact.jobTitle = value;
      if (key.includes('URL') && value.includes('linkedin')) contact.linkedInUrl = value;
      if (key.includes('URL') && !value.includes('linkedin')) contact.companyWebsite = value;
    });
    
    return contact;
  };

  const parseAllVCards = (text: string): Partial<Contact>[] => {
    const contacts: Partial<Contact>[] = [];
    const vcards = text.split(/(?=BEGIN:VCARD)/i);
    
    for (const vcard of vcards) {
      if (vcard.trim().startsWith('BEGIN:VCARD')) {
        const contact = parseVCard(vcard);
        // Only add if we have at least a name or email
        if (contact.firstName || contact.lastName || contact.emailPrimary) {
          contacts.push(contact);
        }
      }
    }
    
    return contacts;
  };

  const handleVCardImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    let parsedContacts: Partial<Contact>[] = [];
    
    // Detect file type and parse accordingly
    if (file.name.endsWith('.csv')) {
      parsedContacts = parseCSV(text);
    } else {
      parsedContacts = parseAllVCards(text);
    }
    
    if (parsedContacts.length === 0) {
      alert('No contacts found in file. Make sure the file is a valid vCard (.vcf) or CSV file.');
      return;
    }
    
    if (parsedContacts.length === 1) {
      // Single contact - open edit form
      setFormData(parsedContacts[0]);
      setShowAddForm(true);
    } else {
      // Multiple contacts - bulk import
      setBulkContacts(parsedContacts);
      setShowBulkImport(true);
    }
    
    if (vcardInputRef.current) vcardInputRef.current.value = '';
  };

  const parseQRData = (data: string): Partial<Contact> => {
    const contact: Partial<Contact> = { source: 'qr_code', tags: [] };
    
    // Check if it's a vCard format
    if (data.startsWith('BEGIN:VCARD')) {
      return parseVCard(data);
    }
    
    // Check if it's a LinkedIn URL
    if (data.includes('linkedin.com')) {
      contact.linkedInUrl = data;
    } else if (data.startsWith('http')) {
      contact.companyWebsite = data;
    }
    
    return contact;
  };

  // Simulate business card OCR (in production, use Tesseract.js or cloud API)
  const simulateBusinessCardScan = async () => {
    // In a real implementation, you would:
    // 1. Capture image from video/canvas
    // 2. Send to OCR service (Tesseract.js locally, or Google Vision API)
    // 3. Parse the text to extract contact info
    
    // For now, return mock data to show the flow
    const mockData: Partial<Contact> = {
      firstName: 'John',
      lastName: 'Smith',
      jobTitle: 'Sales Director',
      company: 'Tech Corp',
      emailPrimary: 'john.smith@techcorp.com',
      phoneMobile: '+61 400 000 000',
      source: 'business_card',
      tags: [],
    };
    
    setFormData(mockData);
    setShowScanner(false);
    setShowAddForm(true);
  };

  const exportContacts = () => {
    const csv = [
      ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Title', 'Tags'].join(','),
      ...contacts.filter(c => c.status === 'active').map(c => [
        c.firstName, c.lastName, c.emailPrimary, c.phoneMobile || '',
        c.company || '', c.jobTitle || '', c.tags.join(';')
      ].map(v => `"${v}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
  };

  const filteredContacts = contacts.filter(c => {
    if (c.status === 'duplicate' && !showDuplicates) return false;
    if (filterTag && !c.tags.includes(filterTag)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.emailPrimary.toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getRelationshipColor = (strength?: string) => {
    switch (strength) {
      case 'hot': return 'text-red-400';
      case 'cold': return 'text-blue-400';
      default: return 'text-yellow-400';
    }
  };

  if (loading) {
    return <div className="text-zinc-400">Loading contacts...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Duplicate Warning Modal */}
      {duplicateWarning && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 max-w-md w-full border border-zinc-700">
            <h3 className="text-lg font-semibold text-yellow-400 mb-4">⚠️ Potential Duplicate Found</h3>
            <p className="text-zinc-300 mb-4">
              A contact with similar {duplicateWarning.duplicates[0]?.field} already exists:
            </p>
            <div className="bg-zinc-800 rounded-lg p-3 mb-4">
              <p className="font-medium">{duplicateWarning.duplicates[0]?.contact.firstName} {duplicateWarning.duplicates[0]?.contact.lastName}</p>
              <p className="text-sm text-zinc-400">{duplicateWarning.duplicates[0]?.contact.emailPrimary}</p>
              <p className="text-sm text-zinc-400">{duplicateWarning.duplicates[0]?.contact.company}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => mergeContacts(duplicateWarning.duplicates[0]?.contact.id, 'new')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
              >
                Merge
              </button>
              <button
                onClick={() => saveContact(true)}
                className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm"
              >
                Create Anyway
              </button>
              <button
                onClick={() => setDuplicateWarning(null)}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 max-w-md w-full border border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {scannerMode === 'card' ? '📷 Scan Business Card' : '📱 Scan QR Code'}
              </h3>
              <button onClick={() => setShowScanner(false)} className="text-zinc-400 hover:text-white p-2">✕</button>
            </div>
            
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setScannerMode('card')}
                className={`flex-1 py-2 rounded-lg ${scannerMode === 'card' ? 'bg-blue-600' : 'bg-zinc-700'}`}
              >
                Business Card
              </button>
              <button
                onClick={() => setScannerMode('qr')}
                className={`flex-1 py-2 rounded-lg ${scannerMode === 'qr' ? 'bg-blue-600' : 'bg-zinc-700'}`}
              >
                QR Code
              </button>
            </div>
            
            <div className="bg-zinc-800 rounded-lg aspect-video flex items-center justify-center mb-4">
              <video ref={videoRef} className="hidden" autoPlay playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <div className="text-zinc-500 text-center p-8">
                <div className="text-4xl mb-2">📷</div>
                <p>Camera access required</p>
                <p className="text-xs mt-2">Click "Start Camera" below</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={simulateBusinessCardScan}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg"
              >
                Capture & Scan
              </button>
              <button
                onClick={() => setShowScanner(false)}
                className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 max-w-lg w-full border border-zinc-700 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">📥 Bulk Import ({bulkContacts.length} contacts)</h3>
              <button onClick={() => { setShowBulkImport(false); setBulkContacts([]); }} className="text-zinc-400 hover:text-white p-2">✕</button>
            </div>
            
            {bulkImporting ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-lg mb-2">Importing contacts...</p>
                <p className="text-zinc-400">{bulkProgress.done} / {bulkProgress.total}</p>
                <div className="w-full bg-zinc-700 rounded-full h-2 mt-4">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="text-zinc-400 mb-4">
                  Review the contacts below. Duplicates will be auto-detected and merged.
                </p>
                
                <div className="max-h-[50vh] overflow-auto space-y-2 mb-4">
                  {bulkContacts.map((c, i) => (
                    <div key={i} className="bg-zinc-800 rounded-lg p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {(c.firstName?.[0] || '')}{(c.lastName?.[0] || '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{c.firstName} {c.lastName}</p>
                        <p className="text-sm text-zinc-400 truncate">{c.emailPrimary || c.phoneMobile || 'No contact info'}</p>
                      </div>
                      {c.company && <span className="text-xs text-zinc-500">{c.company}</span>}
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={importBulkContacts}
                    className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-medium"
                  >
                    Import All ({bulkContacts.length})
                  </button>
                  <button
                    onClick={() => { setShowBulkImport(false); setBulkContacts([]); }}
                    className="bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold">Contacts</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setFormData({ firstName: '', lastName: '', emailPrimary: '', tags: [], source: 'manual', relationshipStrength: 'warm', doNotContact: false }); setShowAddForm(true); setEditMode(false); }}
            className="bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm"
          >
            + Add
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="bg-zinc-700 hover:bg-zinc-600 px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm"
          >
            📷 Scan
          </button>
          <label className="bg-zinc-700 hover:bg-zinc-600 px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm cursor-pointer">
            📥 Import
            <input
              ref={vcardInputRef}
              type="file"
              accept=".vcf,.vcard,.csv"
              onChange={handleVCardImport}
              className="hidden"
            />
          </label>
          <button
            onClick={() => { setMergeMode(!mergeMode); setSelectedForMerge([]); }}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm ${mergeMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-zinc-700 hover:bg-zinc-600'}`}
          >
            🔗 Merge
          </button>
          <button
            onClick={exportContacts}
            className="bg-zinc-700 hover:bg-zinc-600 px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm"
          >
            📤 Export
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100"
        />
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100"
        >
          <option value="">All Tags</option>
          {TAG_OPTIONS.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={showDuplicates}
            onChange={(e) => setShowDuplicates(e.target.checked)}
            className="rounded"
          />
          Show Duplicates
        </label>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold mb-4">
            {editMode ? 'Edit Contact' : 'Add Contact'}
            {formData.source === 'business_card' && ' 📷 (from business card)'}
            {formData.source === 'qr_code' && ' 📱 (from QR code)'}
            {formData.source === 'vcard_import' && ' 📥 (imported)'}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">First Name *</label>
              <input
                type="text"
                value={formData.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Last Name *</label>
              <input
                type="text"
                value={formData.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Email *</label>
              <input
                type="email"
                value={formData.emailPrimary || ''}
                onChange={(e) => setFormData({ ...formData, emailPrimary: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Mobile Phone</label>
              <input
                type="tel"
                value={formData.phoneMobile || ''}
                onChange={(e) => setFormData({ ...formData, phoneMobile: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Company</label>
              <input
                type="text"
                value={formData.company || ''}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Job Title</label>
              <input
                type="text"
                value={formData.jobTitle || ''}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={formData.linkedInUrl || ''}
                onChange={(e) => setFormData({ ...formData, linkedInUrl: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">City</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Country</label>
              <input
                type="text"
                value={formData.country || ''}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Industry</label>
              <input
                type="text"
                value={formData.industry || ''}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">How We Met</label>
              <select
                value={formData.howMet || ''}
                onChange={(e) => setFormData({ ...formData, howMet: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              >
                <option value="">Select...</option>
                {HOW_MET_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Relationship</label>
              <select
                value={formData.relationshipStrength || 'warm'}
                onChange={(e) => setFormData({ ...formData, relationshipStrength: e.target.value as any })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              >
                <option value="hot">🔥 Hot</option>
                <option value="warm">🌤️ Warm</option>
                <option value="cold">❄️ Cold</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm text-zinc-400 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    const tags = formData.tags || [];
                    setFormData({
                      ...formData,
                      tags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
                    });
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    (formData.tags || []).includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm text-zinc-400 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              placeholder="Any additional notes..."
            />
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => saveContact(false)}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-medium"
            >
              {editMode ? 'Update' : 'Save'} Contact
            </button>
            <button
              onClick={() => { setShowAddForm(false); setEditMode(false); setDuplicateWarning(null); }}
              className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Contact List */}
      {filteredContacts.length === 0 ? (
        <div className="text-zinc-400 text-center py-12 bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="text-4xl mb-3">👥</div>
          <p>No contacts yet. Add your first contact or import from vCard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => (
            <div
              key={contact.id}
              className={`bg-zinc-900 rounded-lg p-4 border transition relative ${
                mergeMode && selectedForMerge.includes(contact.id) 
                  ? 'border-purple-500 ring-2 ring-purple-500/30' 
                  : contact.status === 'duplicate' 
                    ? 'border-yellow-600' 
                    : 'border-zinc-800'
              } ${mergeMode ? 'cursor-pointer' : ''} hover:border-zinc-600`}
              onClick={mergeMode ? () => toggleMergeSelect(contact.id) : undefined}
            >
              {/* Delete button (always visible) */}
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (confirm(`Delete ${contact.firstName} ${contact.lastName}?`)) {
                    deleteContact(contact.id);
                  }
                }}
                className="absolute top-2 right-2 text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition"
                title="Delete contact"
              >
                🗑️
              </button>
              
              {/* Merge selection indicator */}
              {mergeMode && (
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
                  ${selectedForMerge.includes(contact.id) ? 'bg-purple-600 border-purple-400' : 'border-zinc-600'}">
                  {selectedForMerge.includes(contact.id) ? '✓' : (selectedForMerge.length > 0 ? '2' : '1')}
                </div>
              )}
              
              <div className="flex items-start justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center text-lg font-medium">
                    {contact.firstName[0]}{contact.lastName[0]}
                  </div>
                  <div>
                    <h4 className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </h4>
                    <p className="text-sm text-zinc-400">{contact.jobTitle}</p>
                  </div>
                </div>
                <span className={getRelationshipColor(contact.relationshipStrength)}>
                  {contact.relationshipStrength === 'hot' ? '🔥' : contact.relationshipStrength === 'cold' ? '❄️' : '🌤️'}
                </span>
              </div>
              <div className="mt-3 text-sm text-zinc-400">
                <p>{contact.company}</p>
                <p className="truncate">{contact.emailPrimary}</p>
              </div>
              {contact.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {contact.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-zinc-800 px-2 py-0.5 rounded">{tag}</span>
                  ))}
                  {contact.tags.length > 3 && (
                    <span className="text-xs text-zinc-500">+{contact.tags.length - 3}</span>
                  )}
                </div>
              )}
              {contact.status === 'duplicate' && (
                <div className="mt-2 text-xs text-yellow-400">⚠️ Duplicate</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Merge Action Bar */}
      {mergeMode && selectedForMerge.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-zinc-800 rounded-lg p-4 flex items-center gap-4 shadow-lg border border-zinc-700 z-50">
          <span className="text-zinc-300">
            {selectedForMerge.length} contact{selectedForMerge.length > 1 ? 's' : ''} selected
          </span>
          {selectedForMerge.length === 2 && (
            <button
              onClick={() => setShowMergeModal(true)}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium"
            >
              Merge Selected
            </button>
          )}
          <button
            onClick={() => { setSelectedForMerge([]); setMergeMode(false); }}
            className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Merge Confirmation Modal */}
      {showMergeModal && selectedForMerge.length === 2 && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full border border-zinc-700">
            <h3 className="text-lg font-semibold mb-4">🔗 Merge Contacts</h3>
            <p className="text-zinc-400 mb-4">
              This will combine these two contacts. Information from both will be preserved where possible.
            </p>
            <div className="space-y-3 mb-6">
              {selectedForMerge.map(id => {
                const c = contacts.find(ct => ct.id === id);
                if (!c) return null;
                return (
                  <div key={id} className="bg-zinc-800 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center">
                      {c.firstName[0]}{c.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium">{c.firstName} {c.lastName}</p>
                      <p className="text-sm text-zinc-400">{c.emailPrimary}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={performMerge}
                className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-medium"
              >
                Merge
              </button>
              <button
                onClick={() => { setShowMergeModal(false); setSelectedForMerge([]); }}
                className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-zinc-400">Total:</span>{' '}
          <span className="font-medium">{contacts.filter(c => c.status === 'active').length}</span>
        </div>
        <div>
          <span className="text-zinc-400">Hot:</span>{' '}
          <span className="font-medium text-red-400">{contacts.filter(c => c.relationshipStrength === 'hot').length}</span>
        </div>
        <div>
          <span className="text-zinc-400">Duplicates:</span>{' '}
          <span className="font-medium text-yellow-400">{contacts.filter(c => c.status === 'duplicate').length}</span>
        </div>
        <div>
          <span className="text-zinc-400">Sources:</span>{' '}
          <span className="font-medium">
            {contacts.filter(c => c.source === 'manual').length} manual, {' '}
            {contacts.filter(c => c.source === 'business_card').length} cards, {' '}
            {contacts.filter(c => c.source === 'qr_code').length} QR
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="text-zinc-400">Loading contacts...</div>}>
      <ContactsContent />
    </Suspense>
  );
}
