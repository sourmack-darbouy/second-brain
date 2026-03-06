import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

interface Email {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  to: string[];
  subject: string;
  snippet: string;
  body: string;
  date: string;
  labels: string[];
  timestamp: number;
}

// GET - Retrieve emails with optional filtering
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contactEmail = searchParams.get('contact');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    // Get all email IDs
    const emailIds = await redis.zrange('emails:by_date', 0, -1, { rev: true });
    
    if (!emailIds || emailIds.length === 0) {
      return NextResponse.json({ emails: [], count: 0 });
    }

    const emails: Email[] = [];

    // Fetch emails
    for (const emailId of emailIds.slice(0, limit)) {
      const emailData = await redis.get(`email:${emailId}`);
      if (emailData) {
        const email = emailData as Email;
        
        // Filter by contact email
        if (contactEmail) {
          const normalizedContact = contactEmail.toLowerCase();
          if (email.fromEmail.toLowerCase() !== normalizedContact &&
              !email.to.some(t => t.toLowerCase() === normalizedContact)) {
            continue;
          }
        }
        
        // Filter by search
        if (search) {
          const searchLower = search.toLowerCase();
          if (!email.subject.toLowerCase().includes(searchLower) &&
              !email.body.toLowerCase().includes(searchLower) &&
              !email.from.toLowerCase().includes(searchLower)) {
            continue;
          }
        }
        
        emails.push(email);
      }
    }

    return NextResponse.json({
      emails,
      count: emails.length,
      total: emailIds.length
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

// POST - Store a new email
export async function POST(request: Request) {
  try {
    const email: Email = await request.json();
    
    // Store email
    await redis.set(`email:${email.id}`, email);
    
    // Add to sorted set by date
    await redis.zadd('emails:by_date', {
      score: email.timestamp,
      member: email.id
    });
    
    // Index by sender
    await redis.sadd(`emails:from:${email.fromEmail.toLowerCase()}`, email.id);
    
    // Index by recipients
    for (const toEmail of email.to) {
      await redis.sadd(`emails:to:${toEmail.toLowerCase()}`, email.id);
    }
    
    return NextResponse.json({ success: true, id: email.id });
  } catch (error) {
    console.error('Error storing email:', error);
    return NextResponse.json(
      { error: 'Failed to store email' },
      { status: 500 }
    );
  }
}

// DELETE - Remove an email
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const emailId = searchParams.get('id');
  
  if (!emailId) {
    return NextResponse.json({ error: 'Email ID required' }, { status: 400 });
  }
  
  try {
    const emailData = await redis.get(`email:${emailId}`);
    
    if (!emailData) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }
    
    const email = emailData as Email;
    
    // Remove from all indexes
    await redis.del(`email:${emailId}`);
    await redis.zrem('emails:by_date', emailId);
    await redis.srem(`emails:from:${email.fromEmail.toLowerCase()}`, emailId);
    
    for (const toEmail of email.to) {
      await redis.srem(`emails:to:${toEmail.toLowerCase()}`, emailId);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email:', error);
    return NextResponse.json(
      { error: 'Failed to delete email' },
      { status: 500 }
    );
  }
}
