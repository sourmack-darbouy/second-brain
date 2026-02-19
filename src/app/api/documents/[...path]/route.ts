import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const docPath = pathSegments.join('/');

  const data = await redis.get<{ content: string; isBase64?: boolean; mimeType?: string }>(`documents:content:${docPath}`);
  
  if (!data) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Check if this is a download request
  const url = new URL(request.url);
  const download = url.searchParams.get('download');
  
  if (download === 'true' && data.isBase64) {
    // Return as file download
    const buffer = Buffer.from(data.content, 'base64');
    const mimeType = data.mimeType || 'application/octet-stream';
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${docPath.split('/').pop()}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  }

  return NextResponse.json({ 
    content: data.content, 
    isBase64: data.isBase64,
    path: docPath 
  });
}
