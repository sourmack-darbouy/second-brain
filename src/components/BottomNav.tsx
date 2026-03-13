'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  
  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  // Don't show bottom nav on Quick Add page
  if (pathname === '/quick') {
    return null;
  }
  
  // Primary tabs (always visible)
  const primaryTabs = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/memories', label: 'Notes', icon: '📝' },
    { href: '/companies', label: 'Companies', icon: '🏢' },
    { href: '/calendar', label: 'Calendar', icon: '📅' },
  ];
  
  // Secondary tabs (in More menu)
  const secondaryTabs = [
    { href: '/documents', label: 'Documents', icon: '📄' },
    { href: '/emails', label: 'Emails', icon: '📧' },
    { href: '/tasks', label: 'Tasks', icon: '✅' },
    { href: '/insights', label: 'Insights', icon: '📊' },
    { href: '/contacts', label: 'Contacts', icon: '👥' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];
  
  // Check if any secondary tab is active
  const isSecondaryActive = secondaryTabs.some(tab => 
    pathname === tab.href || pathname.startsWith(tab.href + '/')
  );

  const handleNavClick = (href: string) => {
    haptic('medium');
    setShowMore(false);
    router.push(href);
  };

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 sm:hidden animate-fade-in"
          onClick={() => setShowMore(false)}
        />
      )}
      
      {/* More Menu Panel */}
      <div 
        ref={moreRef}
        className={`fixed bottom-16 left-0 right-0 bg-zinc-900/98 backdrop-blur-md border-t border-zinc-700 z-40 sm:hidden transition-all duration-200 ${
          showMore ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="grid grid-cols-4 gap-2 p-4 max-w-lg mx-auto">
          {secondaryTabs.map(tab => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
            return (
              <button
                key={tab.href}
                onClick={() => handleNavClick(tab.href)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all active:scale-95 ${
                  isActive 
                    ? 'bg-blue-600/30 text-blue-400' 
                    : 'bg-zinc-800 text-zinc-300 active:bg-zinc-700'
                }`}
              >
                <span className="text-2xl mb-1">{tab.icon}</span>
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 z-40 sm:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {primaryTabs.map(tab => {
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
                <span className="text-xl mb-0.5">{tab.icon}</span>
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
          
          {/* More Button */}
          <button
            onClick={() => { haptic('medium'); setShowMore(!showMore); }}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-95 ${
              showMore || isSecondaryActive
                ? 'text-blue-400' 
                : 'text-zinc-500 active:text-zinc-300'
            }`}
            style={{ 
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span className="text-xl mb-0.5">{showMore ? '✕' : '☰'}</span>
            <span className="text-[10px] font-medium">More</span>
          </button>
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
