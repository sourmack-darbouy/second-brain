import type { Metadata, Viewport } from 'next';
import './globals.css';
import { DesktopNav } from '@/components/Navigation';
import { BottomNav } from '@/components/BottomNav';

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
          <main className="flex-1 p-4 sm:p-6 pb-24 sm:pb-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
        <BottomNav />
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
        
        <DesktopNav />
        
        {/* Mobile: Show Quick Add button in header, rest in bottom nav */}
        <a 
          href="/quick" 
          className="sm:hidden p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
          title="Quick Add"
        >
          ⚡
        </a>
      </div>
    </header>
  );
}
