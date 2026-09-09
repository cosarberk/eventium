/**
 * @fileoverview Top header bar component.
 * Contains theme toggle, connection status, and notification access.
 */
import { motion } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import { useSocket } from '@/hooks/useSocket';
import { useTheme } from '@/hooks/useTheme';

/** SVG icon for sun (light mode) */
function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** SVG icon for moon (dark mode) */
function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14 8.5A6 6 0 117.5 2a4.5 4.5 0 006.5 6.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** SVG icon for notification bell */
function BellIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 6a4 4 0 018 0c0 4.5 2 5.5 2 5.5H2S4 10.5 4 6zM6.27 13.5a1.99 1.99 0 003.46 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Renders the top header bar with connection status, theme toggle, and notification bell.
 * @returns Header element
 */
export function Header() {
  const { isDark, toggle } = useTheme();
  const { isConnected, isConnecting } = useSocket();
  const { unreadCount, toggleOpen } = useNotifications();

  return (
    <header className="fixed top-0 left-sidebar right-0 h-header z-20 flex items-center justify-between px-5 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-primary)]">
      {/* Left: Connection Status */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected
              ? 'bg-emerald-500'
              : isConnecting
                ? 'bg-amber-500 animate-pulse-soft'
                : 'bg-red-500'
          }`}
        />
        <span className="text-xs text-[var(--color-text-tertiary)]">
          {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Theme Toggle */}
        <button
          onClick={toggle}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <motion.div
            key={isDark ? 'moon' : 'sun'}
            initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            {isDark ? <MoonIcon /> : <SunIcon />}
          </motion.div>
        </button>

        {/* Notification Bell */}
        <button
          onClick={toggleOpen}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <BellIcon />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-severity-critical text-white text-[10px] font-bold px-1"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </button>
      </div>
    </header>
  );
}
