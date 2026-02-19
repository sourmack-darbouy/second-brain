import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export interface Contact {
  id: string;
  // Core Identity
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
  
  // Professional
  linkedInUrl?: string;
  companyWebsite?: string;
  industry?: string;
  city?: string;
  country?: string;
  department?: string;
  
  // Relationship
  howMet?: string;
  leadSource?: string;
  relationshipStrength?: 'hot' | 'warm' | 'cold';
  tags: string[];
  notes?: string;
  
  // System
  source: 'manual' | 'business_card' | 'qr_code' | 'vcard_import' | 'email_signature';
  status: 'active' | 'archived' | 'duplicate';
  duplicateOf?: string;
  createdAt: string;
  updatedAt: string;
  
  // Follow-up
  lastContacted?: string;
  nextFollowUp?: string;
  
  // Other
  preferredContactMethod?: 'email' | 'phone' | 'linkedin' | 'whatsapp';
  doNotContact: boolean;
}

function generateId(): string {
  return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function normalizePhone(phone: string): string {
  // Remove all non-digits except +
  return phone.replace(/[^\d+]/g, '');
}

// Get all contacts
export async function GET() {
  try {
    const contacts = await redis.get<Contact[]>('contacts:list') || [];
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

// Add or update contact
export async function POST(request: Request) {
  try {
    const contactData = await request.json();
    const now = new Date().toISOString();
    
    const existingContacts = await redis.get<Contact[]>('contacts:list') || [];
    
    // Check for duplicates
    const duplicates: { field: string; contact: Contact }[] = [];
    
    if (contactData.emailPrimary) {
      const normalizedEmail = normalizeEmail(contactData.emailPrimary);
      const existing = existingContacts.find(c => 
        c.emailPrimary && normalizeEmail(c.emailPrimary) === normalizedEmail && c.id !== contactData.id
      );
      if (existing) duplicates.push({ field: 'email', contact: existing });
    }
    
    if (contactData.phoneMobile) {
      const normalizedPhone = normalizePhone(contactData.phoneMobile);
      const existing = existingContacts.find(c => 
        c.phoneMobile && normalizePhone(c.phoneMobile) === normalizedPhone && c.id !== contactData.id
      );
      if (existing) duplicates.push({ field: 'phone', contact: existing });
    }
    
    // If duplicates found, return them for user decision
    if (duplicates.length > 0 && !contactData.forceCreate) {
      return NextResponse.json({ 
        duplicate: true, 
        duplicates,
        message: 'Potential duplicate contact(s) found'
      });
    }
    
    let contact: Contact;
    
    if (contactData.id) {
      // Update existing
      const index = existingContacts.findIndex(c => c.id === contactData.id);
      if (index >= 0) {
        contact = {
          ...existingContacts[index],
          ...contactData,
          updatedAt: now,
        };
        existingContacts[index] = contact;
      } else {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      }
    } else {
      // Create new
      contact = {
        id: generateId(),
        firstName: contactData.firstName || '',
        lastName: contactData.lastName || '',
        emailPrimary: contactData.emailPrimary || '',
        emailSecondary: contactData.emailSecondary || '',
        phoneMobile: contactData.phoneMobile || '',
        phoneWork: contactData.phoneWork || '',
        phoneDirect: contactData.phoneDirect || '',
        company: contactData.company || '',
        jobTitle: contactData.jobTitle || '',
        photoUrl: contactData.photoUrl || '',
        linkedInUrl: contactData.linkedInUrl || '',
        companyWebsite: contactData.companyWebsite || '',
        industry: contactData.industry || '',
        city: contactData.city || '',
        country: contactData.country || '',
        department: contactData.department || '',
        howMet: contactData.howMet || '',
        leadSource: contactData.leadSource || '',
        relationshipStrength: contactData.relationshipStrength || 'warm',
        tags: contactData.tags || [],
        notes: contactData.notes || '',
        source: contactData.source || 'manual',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        doNotContact: contactData.doNotContact || false,
      };
      existingContacts.push(contact);
    }
    
    await redis.set('contacts:list', existingContacts);
    
    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error('Failed to save contact:', error);
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 });
  }
}

// Delete contact
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    
    const contacts = await redis.get<Contact[]>('contacts:list') || [];
    const filtered = contacts.filter(c => c.id !== id);
    await redis.set('contacts:list', filtered);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}

// Merge contacts
export async function PUT(request: Request) {
  try {
    const { primaryId, secondaryId } = await request.json();
    
    const contacts = await redis.get<Contact[]>('contacts:list') || [];
    const primary = contacts.find(c => c.id === primaryId);
    const secondary = contacts.find(c => c.id === secondaryId);
    
    if (!primary || !secondary) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    
    // Merge secondary into primary (keep non-empty values from both)
    const merged: Contact = {
      ...primary,
      firstName: primary.firstName || secondary.firstName,
      lastName: primary.lastName || secondary.lastName,
      emailPrimary: primary.emailPrimary || secondary.emailPrimary,
      emailSecondary: primary.emailSecondary || secondary.emailSecondary,
      phoneMobile: primary.phoneMobile || secondary.phoneMobile,
      phoneWork: primary.phoneWork || secondary.phoneWork,
      phoneDirect: primary.phoneDirect || secondary.phoneDirect,
      company: primary.company || secondary.company,
      jobTitle: primary.jobTitle || secondary.jobTitle,
      linkedInUrl: primary.linkedInUrl || secondary.linkedInUrl,
      companyWebsite: primary.companyWebsite || secondary.companyWebsite,
      industry: primary.industry || secondary.industry,
      city: primary.city || secondary.city,
      country: primary.country || secondary.country,
      notes: [primary.notes, secondary.notes].filter(Boolean).join('\n\n'),
      tags: [...new Set([...primary.tags, ...secondary.tags])],
      updatedAt: new Date().toISOString(),
    };
    
    // Update primary and mark secondary as duplicate
    const index = contacts.findIndex(c => c.id === primaryId);
    contacts[index] = merged;
    
    const secondaryIndex = contacts.findIndex(c => c.id === secondaryId);
    contacts[secondaryIndex] = {
      ...secondary,
      status: 'duplicate',
      duplicateOf: primaryId,
      updatedAt: new Date().toISOString(),
    };
    
    await redis.set('contacts:list', contacts);
    
    return NextResponse.json({ success: true, contact: merged });
  } catch (error) {
    console.error('Failed to merge contacts:', error);
    return NextResponse.json({ error: 'Failed to merge contacts' }, { status: 500 });
  }
}
