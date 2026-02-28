import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Email-to-Memory webhook endpoint
// Works with SendGrid, Postmark, Zapier, or any email webhook

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  date?: string;
  attachments?: {
    filename: string;
    content: string;
    contentType: string;
  }[];
}

// Simple API key validation
function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.EMAIL_API_KEY || 'second-brain-email-secret';
  
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  return token === apiKey;
}

// Extract text from HTML
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse email sender
function parseSender(from: string): { name: string; email: string } {
  const match = from.match(/(?:"?([^"]*)"?\s)?(?:<)?([^>]+@[^>]+)(?:>)?/);
  if (match) {
    return {
      name: match[1]?.trim() || '',
      email: match[2].trim(),
    };
  }
  return { name: '', email: from };
}

// Detect memory type from subject
function detectType(subject: string): 'note' | 'meeting' | 'task' | 'contact' {
  const lower = subject.toLowerCase();
  
  if (lower.includes('meeting') || lower.includes('call')) return 'meeting';
  if (lower.includes('task') || lower.includes('todo') || lower.includes('to-do')) return 'task';
  if (lower.includes('contact') || lower.includes('referral')) return 'contact';
  
  return 'note';
}

// Extract tags from subject (e.g., [work], #project)
function extractTagsFromSubject(subject: string): string[] {
  const tags: string[] = [];
  
  // Match [tag] format
  const bracketMatches = subject.match(/\[([^\]]+)\]/g);
  if (bracketMatches) {
    tags.push(...bracketMatches.map(t => t.replace(/[\[\]]/g, '').toLowerCase()));
  }
  
  // Match #tag format
  const hashMatches = subject.match(/#(\w+)/g);
  if (hashMatches) {
    tags.push(...hashMatches.map(t => t.replace('#', '').toLowerCase()));
  }
  
  return tags;
}

export async function POST(request: NextRequest) {
  // Validate API key
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const payload: EmailPayload = await request.json();
    
    if (!payload.from || !payload.subject) {
      return NextResponse.json(
        { error: 'Missing required fields: from, subject' },
        { status: 400 }
      );
    }

    const sender = parseSender(payload.from);
    const content = payload.text || (payload.html ? stripHtml(payload.html) : '');
    const type = detectType(payload.subject);
    const tags = extractTagsFromSubject(payload.subject);
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Format memory content
    const typeEmoji = {
      note: '📧',
      meeting: '📅',
      task: '✅',
      contact: '👤',
    };

    const memoryContent = `
${typeEmoji[type]} **Email from ${sender.name || sender.email}**

**Subject:** ${payload.subject}

**From:** ${sender.name ? `${sender.name} <${sender.email}>` : sender.email}
${payload.date ? `**Date:** ${payload.date}` : ''}

---

${content}

${tags.length > 0 ? '\n' + tags.map(t => `#${t}`).join(' ') : ''}

_Captured via email at ${timestamp}_
`.trim();

    // Check if today's memory exists
    const existingContent = await redis.get<string>(`memories:daily:${today}`);
    
    if (existingContent) {
      // Append to existing
      const updatedContent = existingContent + '\n\n---\n' + memoryContent;
      await redis.set(`memories:daily:${today}`, updatedContent);
      await redis.set(`memories:daily:${today}:meta`, { 
        lastModified: new Date().toISOString() 
      });
    } else {
      // Create new
      const newContent = `# ${today}\n\n## Email Captures\n\n${memoryContent}\n`;
      await redis.set(`memories:daily:${today}`, newContent);
      await redis.set(`memories:daily:${today}:meta`, { 
        lastModified: new Date().toISOString() 
      });
      
      // Add to list
      const list = await redis.get<string[]>('memories:daily:list') || [];
      if (!list.includes(today)) {
        await redis.set('memories:daily:list', [...list, today]);
      }
    }

    // Handle attachments if any
    if (payload.attachments && payload.attachments.length > 0) {
      for (const attachment of payload.attachments) {
        const docPath = `email-${today}-${attachment.filename}`;
        await redis.set(`documents:${docPath}`, {
          name: attachment.filename,
          path: docPath,
          content: attachment.content,
          type: attachment.contentType,
          size: Buffer.from(attachment.content, 'base64').length,
          isBase64: true,
          lastModified: new Date().toISOString(),
        });
      }
    }

    // Log the email capture
    console.log(`Email captured from ${sender.email}: ${payload.subject}`);

    return NextResponse.json({
      success: true,
      message: 'Email captured to memory',
      date: today,
      type,
      tags,
    });

  } catch (error) {
    console.error('Email capture error:', error);
    return NextResponse.json(
      { error: 'Failed to process email' },
      { status: 500 }
    );
  }
}

// GET: Instructions for setting up email-to-memory
export async function GET() {
  return NextResponse.json({
    name: 'Email-to-Memory',
    description: 'Send emails to capture them as memories',
    endpoint: '/api/email-capture',
    method: 'POST',
    authentication: 'Bearer token in Authorization header',
    payload: {
      from: 'sender@example.com (required)',
      to: 'your-memory@secondbrain.app',
      subject: 'Email subject - use [tag] or #tag for tags (required)',
      text: 'Plain text content (optional)',
      html: 'HTML content (optional, will be stripped)',
      date: 'Original email date (optional)',
      attachments: [
        {
          filename: 'document.pdf',
          content: 'base64-encoded-content',
          contentType: 'application/pdf',
        },
      ],
    },
    setup: {
      sendgrid: 'Create a SendGrid Inbound Parse webhook pointing to this endpoint',
      postmark: 'Configure inbound webhook in Postmark settings',
      zapier: 'Use Email by Zapier trigger → Webhooks by Zapier POST to this endpoint',
      manual: 'Use curl with Bearer token: EMAIL_API_KEY env variable',
    },
    examples: {
      curl: `curl -X POST https://your-secondbrain.vercel.app/api/email-capture \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"from":"you@example.com","subject":"Meeting notes [work]","text":"Discussed project timeline..."}'`,
    },
  });
}
