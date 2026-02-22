import { NextRequest, NextResponse } from 'next/server';

// OpenClaw Vision API endpoint
const OPENCLAW_VISION_URL = process.env.OPENCLAW_VISION_URL || 'http://109.199.103.250:18790/vision/scan';
const OPENCLAW_VISION_TOKEN = process.env.OPENCLAW_VISION_TOKEN || 'openclaw-vision-internal';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Call OpenClaw Vision API (which has the z.ai credentials)
    const response = await fetch(OPENCLAW_VISION_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_VISION_TOKEN}`
      },
      body: JSON.stringify({ image })
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ 
        error: result.error || 'Vision API error' 
      }, { status: response.status });
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Scan card error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
