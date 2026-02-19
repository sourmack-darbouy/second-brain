import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Public file access for Office apps - no auth required
// URL: /api/public/file?path=FILENAME.xlsx&token=ACCESS_TOKEN
export async function GET(request: Request) {
  const url = new URL(request.url);
  const filePath = url.searchParams.get('path');
  const token = url.searchParams.get('token');
  
  // Simple token validation (use env var in production)
  const validToken = 'sb2024pub';
  
  if (token !== validToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }
  
  if (!filePath) {
    return NextResponse.json({ error: 'File path required' }, { status: 400 });
  }
  
  const data = await redis.get<{ content: string; isBase64?: boolean; mimeType?: string }>(`documents:content:${filePath}`);
  
  if (!data || !data.isBase64) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Return as file with proper headers for Office
  const buffer = Buffer.from(data.content, 'base64');
  const mimeType = data.mimeType || 'application/octet-stream';
  const fileName = filePath.split('/').pop() || 'download';
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'private, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
