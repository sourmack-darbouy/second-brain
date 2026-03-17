import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// GET - Retrieve image
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageId = searchParams.get('id');
  
  if (!imageId) {
    return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
  }
  
  const imageData = await redis.get<string>(`memories:image:${imageId}`);
  
  if (!imageData) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
  
  // Return the base64 data directly
  return NextResponse.json({ 
    data: imageData,
    id: imageId 
  });
}

// POST - Upload image
export async function POST(request: Request) {
  try {
    const { imageData, memoryPath, filename } = await request.json();
    
    if (!imageData) {
      return NextResponse.json({ error: 'Image data required' }, { status: 400 });
    }
    
    // Generate unique ID
    const imageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store image data (base64)
    await redis.set(`memories:image:${imageId}`, imageData);
    
    // Link to memory if provided
    if (memoryPath) {
      const existingImages = await redis.get<string[]>(`memories:images:${memoryPath}`) || [];
      await redis.set(`memories:images:${memoryPath}`, [...existingImages, imageId]);
    }
    
    return NextResponse.json({ 
      success: true, 
      imageId,
      markdown: `![${filename || 'image'}](/api/memories/images?id=${imageId})`
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

// DELETE - Remove image
export async function DELETE(request: Request) {
  const { imageId, memoryPath } = await request.json();
  
  await redis.del(`memories:image:${imageId}`);
  
  if (memoryPath) {
    const existingImages = await redis.get<string[]>(`memories:images:${memoryPath}`) || [];
    await redis.set(
      `memories:images:${memoryPath}`, 
      existingImages.filter(id => id !== imageId)
    );
  }
  
  return NextResponse.json({ success: true });
}
