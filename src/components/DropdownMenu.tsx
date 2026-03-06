'use client';

import { useState } from 'react';

interface DropdownMenuProps {
  label: string;
  icon: string;
  children: React.ReactNode;
}

export function DropdownMenu({ label, icon, children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg font-medium transition text-sm flex items-center gap-1"
      >
        <span>{icon}</span>
        <span>{label}</span>
        <span className="text-xs">▼</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
          {children}
        </div>
      )}
    </div>
  );
}
