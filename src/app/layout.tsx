import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Second Brain',
  description: 'Your personal knowledge management system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Second Brain',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#09090b',
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
          <Header />
          <main className="flex-1 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 bg-zinc-950/95 backdrop-blur z-50">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <span className="text-xl sm:text-2xl">🧠</span>
          <span className="hidden xs:inline">Second Brain</span>
        </h1>
        
        {/* Desktop Nav */}
        <nav className="hidden sm:flex gap-4 lg:gap-6">
          <a href="/" className="text-zinc-400 hover:text-zinc-100 transition text-sm lg:text-base">
            Dashboard
          </a>
          <a href="/memories" className="text-zinc-400 hover:text-zinc-100 transition text-sm lg:text-base">
            Memories
          </a>
          <a href="/documents" className="text-zinc-400 hover:text-zinc-100 transition text-sm lg:text-base">
            Documents
          </a>
          <a href="/contacts" className="text-zinc-400 hover:text-zinc-100 transition text-sm lg:text-base">
            Contacts
          </a>
          <a href="/tasks" className="text-zinc-400 hover:text-zinc-100 transition text-sm lg:text-base">
            Tasks
          </a>
        </nav>

        {/* Mobile Nav */}
        <MobileNav />
      </div>
    </header>
  );
}

function MobileNav() {
  return (
    <div className="sm:hidden flex gap-1">
      <a 
        href="/quick" 
        className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
        title="Quick Add"
      >
        ⚡
      </a>
      <a 
        href="/" 
        className="p-2 rounded-lg hover:bg-zinc-800 transition"
        title="Dashboard"
      >
        🏠
      </a>
      <a 
        href="/memories" 
        className="p-2 rounded-lg hover:bg-zinc-800 transition"
        title="Memories"
      >
        📝
      </a>
      <a 
        href="/contacts" 
        className="p-2 rounded-lg hover:bg-zinc-800 transition"
        title="Contacts"
      >
        👥
      </a>
    </div>
  );
}
