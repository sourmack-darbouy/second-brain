import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Quick capture from browser extension or bookmarklet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      url, 
      selection, 
      notes, 
      tags = [],
      source = 'browser',
    } = body;

    if (!title && !selection && !notes) {
      return NextResponse.json(
        { error: 'At least one of title, selection, or notes required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Format memory content
    const lines: string[] = [];
    
    lines.push('🌐 **From Web**');
    lines.push('');
    
    if (title) {
      lines.push(`**${title}**`);
    }
    
    if (url) {
      lines.push(`🔗 [${url}](${url})`);
      lines.push('');
    }
    
    if (selection) {
      lines.push('> ' + selection.split('\n').join('\n> '));
      lines.push('');
    }
    
    if (notes) {
      lines.push(notes);
      lines.push('');
    }
    
    if (tags.length > 0) {
      lines.push(tags.map((t: string) => `#${t}`).join(' '));
      lines.push('');
    }
    
    lines.push(`_Captured at ${timestamp}_`);

    const memoryContent = lines.join('\n').trim();

    // Append to today's memory
    const existingContent = await redis.get<string>(`memories:daily:${today}`);
    
    if (existingContent) {
      const updatedContent = existingContent + '\n\n---\n\n' + memoryContent;
      await redis.set(`memories:daily:${today}`, updatedContent);
      await redis.set(`memories:daily:${today}:meta`, { 
        lastModified: new Date().toISOString() 
      });
    } else {
      const newContent = `# ${today}\n\n## Web Clips\n\n${memoryContent}\n`;
      await redis.set(`memories:daily:${today}`, newContent);
      await redis.set(`memories:daily:${today}:meta`, { 
        lastModified: new Date().toISOString() 
      });
      
      const list = await redis.get<string[]>('memories:daily:list') || [];
      if (!list.includes(today)) {
        await redis.set('memories:daily:list', [...list, today]);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Captured to memory',
      date: today,
    });

  } catch (error) {
    console.error('Browser capture error:', error);
    return NextResponse.json(
      { error: 'Failed to capture' },
      { status: 500 }
    );
  }
}

// GET: Return bookmarklet code and extension instructions
export async function GET() {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://second-brain-theta-ebon.vercel.app';

  // Bookmarklet JavaScript
  const bookmarkletCode = `
(function(){
  var title = document.title;
  var url = window.location.href;
  var selection = window.getSelection().toString();
  var notes = prompt('Add notes (optional):') || '';
  var tags = prompt('Tags (comma-separated):') || '';
  
  fetch('${baseUrl}/api/browser-capture', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      title: title,
      url: url,
      selection: selection,
      notes: notes,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      source: 'bookmarklet'
    })
  }).then(r => r.json()).then(d => {
    alert(d.success ? '✓ Saved to memory!' : 'Error: ' + d.error);
  }).catch(e => alert('Error: ' + e.message));
})();
`.replace(/\n/g, '').replace(/\s+/g, ' ');

  const bookmarkletUrl = `javascript:${encodeURIComponent(bookmarkletCode)}`;

  return NextResponse.json({
    bookmarklet: {
      url: bookmarkletUrl,
      instructions: 'Drag this link to your bookmarks bar',
      html: `<a href="${bookmarkletUrl}">🧠 Save to Brain</a>`,
    },
    extension: {
      manifest: {
        manifest_version: 3,
        name: 'Second Brain Clipper',
        version: '1.0',
        description: 'Save web content to Second Brain',
        permissions: ['activeTab', 'scripting'],
        action: {
          default_popup: 'popup.html',
          default_icon: 'icon.png',
        },
      },
      files: {
        'popup.html': `<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 320px; padding: 16px; font-family: system-ui; background: #09090b; color: #fafafa; }
    h2 { margin: 0 0 16px; font-size: 18px; }
    textarea { width: 100%; height: 100px; background: #18181b; border: 1px solid #27272a; color: #fafafa; padding: 8px; border-radius: 6px; resize: none; }
    input { width: 100%; background: #18181b; border: 1px solid #27272a; color: #fafafa; padding: 8px; border-radius: 6px; margin-bottom: 8px; }
    button { width: 100%; background: #2563eb; color: white; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
    button:hover { background: #1d4ed8; }
    .success { color: #22c55e; text-align: center; margin-top: 8px; }
  </style>
</head>
<body>
  <h2>🧠 Save to Second Brain</h2>
  <textarea id="notes" placeholder="Add notes..."></textarea>
  <input id="tags" type="text" placeholder="Tags (comma-separated)" />
  <label><input type="checkbox" id="selection" checked /> Include selected text</label>
  <button id="save">Save to Memory</button>
  <div id="result"></div>
  <script src="popup.js"></script>
</body>
</html>`,
        'popup.js': `document.getElementById('save').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  
  let selection = '';
  if (document.getElementById('selection').checked) {
    [{result: selection}] = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => window.getSelection().toString()
    });
  }
  
  const notes = document.getElementById('notes').value;
  const tags = document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean);
  
  const res = await fetch('${baseUrl}/api/browser-capture', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      title: tab.title,
      url: tab.url,
      selection,
      notes,
      tags,
      source: 'extension'
    })
  });
  
  const data = await res.json();
  document.getElementById('result').innerHTML = data.success 
    ? '<p class="success">✓ Saved!</p>' 
    : '<p style="color:red">Error: ' + data.error + '</p>';
});`,
      },
    },
    api: {
      endpoint: '/api/browser-capture',
      method: 'POST',
      body: {
        title: 'Page title (optional)',
        url: 'Page URL (optional)',
        selection: 'Selected text (optional)',
        notes: 'Your notes (optional)',
        tags: ['tag1', 'tag2'],
        source: 'bookmarklet|extension|api',
      },
    },
  });
}
