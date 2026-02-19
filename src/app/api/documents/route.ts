import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

interface Document {
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: string;
  isBinary?: boolean;
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
    'xlsx': 'Excel',
    'xls': 'Excel',
    'pptx': 'PowerPoint',
    'ppt': 'PowerPoint',
    'docx': 'Word',
    'doc': 'Word',
    'png': 'Image',
    'jpg': 'Image',
    'jpeg': 'Image',
    'gif': 'Image',
  };
  return types[ext] || 'File';
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, string> = {
    'md': 'text/markdown',
    'txt': 'text/plain',
    'json': 'application/json',
    'csv': 'text/csv',
    'pdf': 'application/pdf',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'ppt': 'application/vnd.ms-powerpoint',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'yaml': 'text/yaml',
    'yml': 'text/yaml',
  };
  return types[ext] || 'application/octet-stream';
}

function isBinaryFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const binaryExts = ['xlsx', 'xls', 'pptx', 'ppt', 'docx', 'doc', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'exe'];
  return binaryExts.includes(ext);
}

export async function GET() {
  const documents = await redis.get<Document[]>('documents:list') || [];
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const { name, path, content, isBase64 } = await request.json();
  const now = new Date().toISOString();
  
  // Calculate size
  let size: number;
  if (isBase64) {
    size = Math.floor((content.length * 3) / 4);
  } else {
    size = new Blob([content]).size;
  }
  
  const doc: Document = {
    name,
    path,
    type: getFileType(name),
    size,
    lastModified: now,
    isBinary: isBase64,
  };

  // Store document content with metadata
  const docData = {
    content,
    isBase64: isBase64 || false,
    mimeType: getMimeType(name),
  };
  await redis.set(`documents:content:${path}`, docData);
  
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
