'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
  onNew?: () => void;
  onSearch?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Ignore if typing in input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Only allow Escape
      if (e.key === 'Escape') {
        shortcuts.onEscape?.();
      }
      return;
    }

    const isMeta = e.metaKey || e.ctrlKey;

    switch (e.key) {
      case 'n':
      case 'N':
        if (isMeta) {
          e.preventDefault();
          shortcuts.onNew?.();
        }
        break;
      case 'k':
      case 'K':
        if (isMeta) {
          e.preventDefault();
          shortcuts.onSearch?.();
        }
        break;
      case 'e':
      case 'E':
        if (isMeta) {
          e.preventDefault();
          shortcuts.onEdit?.();
        }
        break;
      case 's':
      case 'S':
        if (isMeta) {
          e.preventDefault();
          shortcuts.onSave?.();
        }
        break;
      case 'ArrowRight':
        if (isMeta) {
          e.preventDefault();
          shortcuts.onNext?.();
        }
        break;
      case 'ArrowLeft':
        if (isMeta) {
          e.preventDefault();
          shortcuts.onPrev?.();
        }
        break;
      case 'Escape':
        shortcuts.onEscape?.();
        break;
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

// Display shortcuts help
export function KeyboardShortcutsHelp() {
  return (
    <div className="text-xs text-zinc-500 space-y-1">
      <div><kbd className="bg-zinc-800 px-1 rounded">⌘N</kbd> New memory</div>
      <div><kbd className="bg-zinc-800 px-1 rounded">⌘K</kbd> Search</div>
      <div><kbd className="bg-zinc-800 px-1 rounded">⌘E</kbd> Edit</div>
      <div><kbd className="bg-zinc-800 px-1 rounded">⌘S</kbd> Save</div>
      <div><kbd className="bg-zinc-800 px-1 rounded">⌘←/→</kbd> Navigate</div>
    </div>
  );
}
