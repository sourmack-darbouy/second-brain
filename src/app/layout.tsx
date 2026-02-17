import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Second Brain',
  description: 'Your personal knowledge management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-zinc-800 px-6 py-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">🧠</span>
                <span>Second Brain</span>
              </h1>
              <nav className="flex gap-6">
                <a href="/" className="text-zinc-400 hover:text-zinc-100 transition">
                  Dashboard
                </a>
                <a href="/memories" className="text-zinc-400 hover:text-zinc-100 transition">
                  Memories
                </a>
                <a href="/documents" className="text-zinc-400 hover:text-zinc-100 transition">
                  Documents
                </a>
                <a href="/tasks" className="text-zinc-400 hover:text-zinc-100 transition">
                  Tasks
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
