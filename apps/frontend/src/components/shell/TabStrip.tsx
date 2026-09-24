/**
 * @fileoverview Document tab strip — the desktop "open document" bar above the
 * content area. Shows the active view as a tab; the + opens the command palette
 * to jump elsewhere.
 */
import { useRouterState } from '@tanstack/react-router';
import { NAV_ITEMS, titleForPath } from './nav';

/** The tab strip. */
export function TabStrip() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = NAV_ITEMS.find((n) => (n.to === '/' ? path === '/' : path.startsWith(n.to)));

  return (
    <div className="flex h-9 shrink-0 items-end gap-1 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-2">
      <div className="flex items-center gap-2 h-[30px] px-3 rounded-t-lg border border-b-0 border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] text-xs font-medium text-[var(--color-text-primary)]">
        <span className="text-brand-500">{active?.icon}</span>
        <span className="truncate max-w-[180px]">{titleForPath(path)}</span>
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('eventium:command-palette'))}
        title="Yeni sekme / git"
        className="mb-1 w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
