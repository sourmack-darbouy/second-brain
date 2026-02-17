import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

interface Document {
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: string;
}

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, string> = {
    'md': 'Markdown',
    'txt': 'Text',
    'json': 'JSON',
    'ts': 'TypeScript',
    'tsx': 'TypeScript React',
    'js': 'JavaScript',
    'jsx': 'JavaScript React',
    'py': 'Python',
    'yaml': 'YAML',
    'yml': 'YAML',
    'csv': 'CSV',
    'pdf': 'PDF',
  };
  return types[ext] || 'File';
}

export async function GET() {
  const documents = await redis.get<Document[]>('documents:list') || [];
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const { name, path, content } = await request.json();
  const now = new Date().toISOString();
  
  const doc: Document = {
    name,
    path,
    type: getFileType(name),
    size: new Blob([content]).size,
    lastModified: now,
  };

  // Store document content
  await redis.set(`documents:content:${path}`, content);
  
  // Update document list
  const list = await redis.get<Document[]>('documents:list') || [];
  const existingIndex = list.findIndex(d => d.path === path);
  
  if (existingIndex >= 0) {
    list[existingIndex] = doc;
  } else {
    list.push(doc);
  }
  
  await redis.set('documents:list', list);
  
  return NextResponse.json({ success: true, document: doc });
}

export async function DELETE(request: Request) {
  const { path } = await request.json();
  
  // Delete content
  await redis.del(`documents:content:${path}`);
  
  // Remove from list
  const list = await redis.get<Document[]>('documents:list') || [];
  const filtered = list.filter(d => d.path !== path);
  await redis.set('documents:list', filtered);
  
  return NextResponse.json({ success: true });
}
