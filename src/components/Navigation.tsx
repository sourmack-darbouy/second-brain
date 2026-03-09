'use client';

import { usePathname } from 'next/navigation';

export function DesktopNav() {
  const pathname = usePathname();
  
  const links = [
    { href: '/', label: 'Dashboard', icon: '🏠' },
    { href: '/calendar', label: 'Calendar', icon: '📅' },
    { href: '/memories', label: 'Memories', icon: '📝' },
    { href: '/companies', label: 'Companies', icon: '🏢' },
    { href: '/documents', label: 'Documents', icon: '📄' },
    { href: '/contacts', label: 'Contacts', icon: '👥' },
    { href: '/tasks', label: 'Tasks', icon: '✅' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
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
