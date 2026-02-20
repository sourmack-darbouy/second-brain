import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { image, apiKey } = await request.json();
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key required. Add it in Settings.' }, { status: 400 });
    }
    
    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract contact information from this business card image. Return ONLY a JSON object with these fields (use null for missing fields):
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

Important:
- Split the full name into firstName and lastName
- Clean up phone numbers, include country code
- For website, include https:// prefix
- Return ONLY the JSON, no other text`
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ 
        error: error.error?.message || 'Failed to analyze image' 
      }, { status: response.status });
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }
    
    // Parse the JSON from the response
    try {
      // Remove any markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const contactData = JSON.parse(jsonStr);
      
      return NextResponse.json({ 
        success: true, 
        data: {
          ...contactData,
          source: 'business_card',
          tags: []
        }
      });
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json({ 
        error: 'Failed to parse AI response',
        raw: content 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Scan card error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
