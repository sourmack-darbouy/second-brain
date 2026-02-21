import { NextRequest, NextResponse } from 'next/server';
import { analyzeImage, getDefaultProvider, VisionProvider } from '@/lib/vision';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, apiKey, provider, model } = body;
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API key required. Add it in Settings.' 
      }, { status: 400 });
    }

    // Use specified provider or default from environment
    const visionProvider: VisionProvider = provider || getDefaultProvider();
    
    // Call vision API through abstraction layer
    const result = await analyzeImage(image, {
      provider: visionProvider,
      apiKey,
      model
    });
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to analyze image' 
      }, { status: 400 });
    }
    
    if (!result.data) {
      return NextResponse.json({ 
        error: 'Failed to parse AI response',
        raw: result.raw 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...result.data,
        source: 'business_card',
        tags: []
      },
      provider: visionProvider
    });
    
  } catch (error) {
    console.error('Scan card error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
