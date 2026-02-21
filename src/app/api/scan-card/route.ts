import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Business card extraction prompt
const BUSINESS_CARD_PROMPT = `Extract contact information from this business card image. Return ONLY a JSON object with these fields (use null for missing fields):
{
  "firstName": "first name only",
  "lastName": "last name only", 
  "emailPrimary": "email address",
  "phoneMobile": "phone number with country code",
  "company": "company name",
  "jobTitle": "job title",
  "companyWebsite": "website URL",
  "linkedInUrl": "LinkedIn URL if present",
  "city": "city if mentioned",
  "country": "country if mentioned"
}

Return ONLY the JSON, no other text.`;

// Get z.ai API key from OpenClaw config
function getOpenClayApiKey(): string | null {
  try {
    const authPath = path.join('/root/.openclaw/agents/main/agent/auth-profiles.json');
    const authConfig = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    return authConfig.profiles['zai:default']?.key || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Get API key from OpenClaw config (no user input needed)
    const apiKey = getOpenClayApiKey();
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Vision API not configured. OpenClaw z.ai credentials not found.' 
      }, { status: 500 });
    }

    // Call z.ai Vision API
    const response = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4.6v',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: BUSINESS_CARD_PROMPT },
            { type: 'image_url', image_url: { url: image } }
          ]
        }],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ 
        error: error.error?.message || 'Vision API error' 
      }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: 'No response from vision API' }, { status: 500 });
    }

    // Parse JSON from response
    let contactData;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      contactData = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ 
        error: 'Failed to parse vision response',
        raw: content 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...contactData,
        source: 'business_card',
        tags: []
      }
    });
    
  } catch (error) {
    console.error('Scan card error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
