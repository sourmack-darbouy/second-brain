// Test script for vision providers
import { analyzeImage } from './src/lib/vision.ts';

// Sample business card image (base64 encoded simple test)
// This is a 1x1 transparent pixel - just testing API connectivity
const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function test() {
  const provider = process.env.VISION_PROVIDER || 'zai';
  const apiKey = process.env.VISION_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key found. Set VISION_API_KEY env var');
    console.log('Example: VISION_API_KEY=sk-xxx node test-vision.mjs');
    process.exit(1);
  }
  
  console.log(`Testing ${provider} vision API...`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  
  const result = await analyzeImage(testImage, { provider, apiKey });
  
  if (result.success) {
    console.log('✅ API call successful!');
    console.log('Response:', result.data);
  } else {
    console.log('❌ API call failed:', result.error);
  }
}

test();
