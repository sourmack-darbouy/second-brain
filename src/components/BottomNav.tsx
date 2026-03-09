'use client';

import { usePathname, useRouter } from 'next/navigation';

// Haptic feedback utility
const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    };
    navigator.vibrate(patterns[type]);
  }
};

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Don't show bottom nav on Quick Add page
  if (pathname === '/quick') {
    return null;
  }
  
  const tabs = [
    { href: '/', label: 'Home', icon: '🏠', activeIcon: '🏠' },
    { href: '/calendar', label: 'Calendar', icon: '📅', activeIcon: '📅' },
    { href: '/memories', label: 'Notes', icon: '📝', activeIcon: '📝' },
    { href: '/companies', label: 'Companies', icon: '🏢', activeIcon: '🏢' },
    { href: '/contacts', label: 'Contacts', icon: '👥', activeIcon: '👥' },
  ];

  const handleNavClick = (href: string) => {
    haptic('medium');
    router.push(href);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 z-40 sm:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map(tab => {
            const isActive = pathname === tab.href || 
              (tab.href !== '/' && pathname.startsWith(tab.href));
            
            return (
              <button
                key={tab.href}
                onClick={() => handleNavClick(tab.href)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-95 ${
                  isActive 
                    ? 'text-blue-400' 
                    : 'text-zinc-500 active:text-zinc-300'
                }`}
                style={{ 
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span className="text-xl mb-0.5">{isActive ? tab.activeIcon : tab.icon}</span>
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button for Quick Add */}
      <button
        onClick={() => { haptic('heavy'); router.push('/quick'); }}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-full shadow-lg flex items-center justify-center text-2xl sm:hidden z-50 transition-transform active:scale-90"
        style={{ 
          touchAction: 'manipulation',
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
        }}
        aria-label="Quick Add"
      >
        ⚡
      </button>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-20 sm:hidden" />
    </>
  );
}
