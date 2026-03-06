import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET() {
  try {
    // Fetch all contacts
    const contactsData = await redis.get('contacts');
    const contacts = (contactsData as any[]) || [];

    // CSV headers
    const headers = [
      'First Name',
      'Last Name',
      'Email (Primary)',
      'Email (Secondary)',
      'Phone (Mobile)',
      'Phone (Work)',
      'Company',
      'Job Title',
      'LinkedIn URL',
      'Website',
      'Industry',
      'City',
      'Country',
      'How Met',
      'Lead Source',
      'Relationship',
      'Tags',
      'Notes',
      'Created At',
      'Last Contacted',
      'Next Follow-Up'
    ];

    // Escape CSV field
    const escapeCSV = (field: any) => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV rows
    const rows = contacts.map(contact => [
      escapeCSV(contact.firstName),
      escapeCSV(contact.lastName),
      escapeCSV(contact.emailPrimary),
      escapeCSV(contact.emailSecondary),
      escapeCSV(contact.phoneMobile),
      escapeCSV(contact.phoneWork),
      escapeCSV(contact.company),
      escapeCSV(contact.jobTitle),
      escapeCSV(contact.linkedInUrl),
      escapeCSV(contact.companyWebsite),
      escapeCSV(contact.industry),
      escapeCSV(contact.city),
      escapeCSV(contact.country),
      escapeCSV(contact.howMet),
      escapeCSV(contact.leadSource),
      escapeCSV(contact.relationshipStrength),
      escapeCSV((contact.tags || []).join('; ')),
      escapeCSV(contact.notes),
      escapeCSV(contact.createdAt),
      escapeCSV(contact.lastContacted),
      escapeCSV(contact.nextFollowUp)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Return as downloadable file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="second-brain-contacts-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export contacts' },
      { status: 500 }
    );
  }
}
