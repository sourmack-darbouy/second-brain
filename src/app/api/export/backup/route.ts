import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET() {
  try {
    // Fetch all data
    const [memoriesData, contactsData, tasksData, documentsData] = await Promise.all([
      redis.get('memories'),
      redis.get('contacts'),
      redis.get('tasks'),
      redis.get('documents'),
    ]);

    const memories = (memoriesData as any[]) || [];
    const contacts = (contactsData as any[]) || [];
    const tasks = (tasksData as any[]) || [];
    const documents = (documentsData as any[]) || [];

    // Create manifest
    const manifest = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      counts: {
        memories: memories.length,
        contacts: contacts.length,
        tasks: tasks.length,
        documents: documents.length,
      },
      files: [
        'memories.json',
        'contacts.json',
        'tasks.json',
        'documents.json',
        'README.md'
      ]
    };

    // Create README
    const readme = `# Second Brain Backup

Exported: ${manifest.exportDate}

## Contents

- **memories.json** - All memories (${memories.length} total)
- **contacts.json** - All contacts (${contacts.length} total)
- **tasks.json** - All tasks (${tasks.length} total)
- **documents.json** - All documents (${documents.length} total)
- **manifest.json** - Export metadata

## How to Restore

This backup contains all your Second Brain data in JSON format. To restore:

1. Keep this backup safe (cloud storage, external drive, etc.)
2. Data can be imported back using the Second Brain API
3. Contact support if you need help restoring

## Stats

- **Memories:** ${memories.length}
- **Contacts:** ${contacts.length}
- **Tasks:** ${tasks.length}
- **Documents:** ${documents.length}

---

*Second Brain - Your Personal Knowledge Management System*
`;

    // Return as JSON (client will create ZIP)
    const backup = {
      manifest,
      readme,
      data: {
        memories,
        contacts,
        tasks,
        documents,
      }
    };

    return NextResponse.json(backup, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="second-brain-backup-${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}
