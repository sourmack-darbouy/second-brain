/**
 * Vision Provider Abstraction
 * 
 * Supports multiple vision API providers for business card scanning.
 * Configure via VISION_PROVIDER env var (default: openai)
 * 
 * Supported providers:
 * - openai: OpenAI GPT-4o-mini Vision
 * - zai: z.ai GLM-4V
 * - google: Google Gemini Vision (future)
 * - anthropic: Anthropic Claude Vision (future)
 */

export type VisionProvider = 'openai' | 'zai' | 'google' | 'anthropic';

export interface VisionConfig {
  provider: VisionProvider;
  apiKey: string;
  model?: string;
}

export interface VisionResponse {
  success: boolean;
  data?: any;
  error?: string;
  raw?: string;
}

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

Important:
- Split the full name into firstName and lastName
- Clean up phone numbers, include country code
- For website, include https:// prefix
- Return ONLY the JSON, no other text`;

/**
 * OpenAI Vision Provider
 */
async function openaiVision(image: string, apiKey: string, model = 'gpt-4o-mini'): Promise<VisionResponse> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: BUSINESS_CARD_PROMPT },
              { type: 'image_url', image_url: { url: image, detail: 'high' } }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'OpenAI API error' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'No response from OpenAI' };
    }

    return { success: true, data: parseJsonResponse(content), raw: content };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * z.ai Vision Provider (GLM-4.6V)
 * 
 * Uses the coding API with vision-capable models.
 * Requires z.ai Pro subscription for vision access.
 */
async function zaiVision(image: string, apiKey: string, model = 'glm-4.6v'): Promise<VisionResponse> {
  try {
    // z.ai coding API with vision support
    const response = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: BUSINESS_CARD_PROMPT },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'z.ai API error' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'No response from z.ai' };
    }

    return { success: true, data: parseJsonResponse(content), raw: content };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Google Gemini Vision Provider (placeholder for future)
 */
async function googleVision(image: string, apiKey: string, model = 'gemini-1.5-flash'): Promise<VisionResponse> {
  // TODO: Implement Google Gemini Vision
  return { success: false, error: 'Google Gemini Vision not yet implemented' };
}

/**
 * Anthropic Claude Vision Provider (placeholder for future)
 */
async function anthropicVision(image: string, apiKey: string, model = 'claude-3-haiku-20240307'): Promise<VisionResponse> {
  // TODO: Implement Anthropic Claude Vision
  return { success: false, error: 'Anthropic Claude Vision not yet implemented' };
}

/**
 * Parse JSON from AI response, handling markdown code blocks
 */
function parseJsonResponse(content: string): any {
  try {
    // Remove markdown code blocks if present
    const jsonStr = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Main vision analysis function - routes to correct provider
 */
export async function analyzeImage(
  image: string, 
  config: VisionConfig
): Promise<VisionResponse> {
  const { provider, apiKey, model } = config;

  if (!apiKey) {
    return { success: false, error: `${provider} API key required. Add it in Settings.` };
  }

  switch (provider) {
    case 'openai':
      return openaiVision(image, apiKey, model);
    case 'zai':
      return zaiVision(image, apiKey, model);
    case 'google':
      return googleVision(image, apiKey, model);
    case 'anthropic':
      return anthropicVision(image, apiKey, model);
    default:
      return { success: false, error: `Unknown vision provider: ${provider}` };
  }
}

/**
 * Get default provider from environment or fallback
 */
export function getDefaultProvider(): VisionProvider {
  const env = process.env.VISION_PROVIDER as VisionProvider;
  if (env && ['openai', 'zai', 'google', 'anthropic'].includes(env)) {
    return env;
  }
  return 'openai';
}

/**
 * Get available providers with their display info
 */
export function getProviderInfo(): Record<VisionProvider, { name: string; models: string[]; keyUrl: string }> {
  return {
    openai: {
      name: 'OpenAI',
      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
      keyUrl: 'https://platform.openai.com/api-keys'
    },
    zai: {
      name: 'z.ai (智谱)',
      models: ['glm-4.6v'],
      keyUrl: 'https://api.z.ai'
    },
    google: {
      name: 'Google Gemini',
      models: ['gemini-1.5-flash', 'gemini-1.5-pro'],
      keyUrl: 'https://aistudio.google.com/app/apikey'
    },
    anthropic: {
      name: 'Anthropic Claude',
      models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'],
      keyUrl: 'https://console.anthropic.com/settings/keys'
    }
  };
}
