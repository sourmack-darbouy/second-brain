'use client';

import { usePathname } from 'next/navigation';

export function DesktopNav() {
  const pathname = usePathname();
  
  const links = [
    { href: '/', label: 'Dashboard', icon: '🏠' },
    { href: '/memories', label: 'Memories', icon: '📝' },
    { href: '/documents', label: 'Documents', icon: '📄' },
    { href: '/contacts', label: 'Contacts', icon: '👥' },
    { href: '/tasks', label: 'Tasks', icon: '✅' },
  ];
  
  return (
    <nav className="hidden sm:flex gap-4 lg:gap-6">
      {links.map(link => {
        const isActive = pathname === link.href;
        return (
          <a 
            key={link.href}
            href={link.href} 
            className={`transition text-sm lg:text-base ${
              isActive 
                ? 'text-blue-400 font-medium' 
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  
  const links = [
    { href: '/quick', label: 'Quick Add', icon: '⚡', highlight: true },
    { href: '/', label: 'Dashboard', icon: '🏠' },
    { href: '/memories', label: 'Memories', icon: '📝' },
    { href: '/documents', label: 'Documents', icon: '📄' },
    { href: '/contacts', label: 'Contacts', icon: '👥' },
    { href: '/tasks', label: 'Tasks', icon: '✅' },
  ];
  
  return (
    <div className="sm:hidden flex gap-1">
      {links.map(link => {
        const isActive = pathname === link.href;
        const isQuickAdd = link.href === '/quick';
        
        return (
          <a 
            key={link.href}
            href={link.href} 
            className={`p-2 rounded-lg transition relative ${
              isQuickAdd
                ? 'bg-blue-600 hover:bg-blue-700'
                : isActive
                  ? 'bg-zinc-700 text-blue-400'
                  : 'hover:bg-zinc-800'
            }`}
            title={link.label}
          >
            {link.icon}
            {isActive && !isQuickAdd && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
            )}
          </a>
        );
      })}
    </div>
  );
}
