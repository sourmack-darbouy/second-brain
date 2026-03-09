'use client';

import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();
  
  // Don't show bottom nav on Quick Add page (it has its own layout)
  if (pathname === '/quick') {
    return null;
  }
  
  const tabs = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/calendar', label: 'Calendar', icon: '📅' },
    { href: '/memories', label: 'Notes', icon: '📝' },
    { href: '/companies', label: 'Companies', icon: '🏢' },
    { href: '/contacts', label: 'Contacts', icon: '👥' },
  ];
  
  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-40 sm:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {tabs.map(tab => {
            const isActive = pathname === tab.href;
            return (
              <a
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition ${
                  isActive 
                    ? 'text-blue-400 bg-zinc-800/50' 
                    : 'text-zinc-400 active:bg-zinc-800'
                }`}
              >
                <span className="text-xl mb-0.5">{tab.icon}</span>
                <span className="text-xs">{tab.label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button for Quick Add */}
      <a
        href="/quick"
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-full shadow-lg flex items-center justify-center text-2xl sm:hidden z-50"
        title="Quick Add"
      >
        ⚡
      </a>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-20 sm:hidden" />
    </>
  );
}
