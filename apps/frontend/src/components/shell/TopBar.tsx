/**
 * @fileoverview Top command bar — page title, mobile menu toggle, live status,
 * command-palette trigger and notifications. Sits inside the content column, so
 * it never overlaps the activity rail.
 */
import { useRouterState } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import { useSocket } from '@/hooks/useSocket';
import { useUIStore } from '@/storage/ui.store';
import { titleForPath } from './nav';

function openPalette() {
  window.dispatchEvent(new Event('eventium:command-palette'));
}

/** The sticky top bar. */
export function TopBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav);
  const { isConnected, isConnecting } = useSocket();
  const { unreadCount, toggleOpen } = useNotifications();

  return (
    <header className="sticky top-0 z-20 h-header shrink-0 flex items-center justify-between gap-3 px-3 sm:px-4 bg-[var(--color-bg-elevated)]/80 backdrop-blur-xl border-b border-[var(--color-border-primary)]">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={toggleMobileNav}
          aria-label="Open navigation"
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M2 4.5h14M2 9h14M2 13.5h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
          {titleForPath(path)}
        </h1>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={openPalette}
          className="hidden sm:flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-lg text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Ara / komut</span>
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] text-[10px]">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={openPalette}
          aria-label="Command palette"
          className="sm:hidden w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div
          className="flex items-center gap-1.5 px-2 h-8 rounded-lg"
          title={isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Disconnected'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-500'
                : isConnecting
                  ? 'bg-amber-500 animate-pulse-soft'
                  : 'bg-red-500'
            }`}
          />
          <span className="hidden lg:inline text-[11px] text-[var(--color-text-tertiary)]">
            {isConnected ? 'Canlı' : isConnecting ? 'Bağlanıyor' : 'Kopuk'}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleOpen}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          className="relative w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 6a4 4 0 018 0c0 4.5 2 5.5 2 5.5H2S4 10.5 4 6zM6.27 13.5a1.99 1.99 0 003.46 0"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] flex items-center justify-center rounded-full bg-severity-critical text-white text-[9px] font-bold px-1"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </button>
      </div>
    </header>
  );
}
