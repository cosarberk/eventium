/**
 * @fileoverview Top menu/title bar — desktop-app chrome.
 * App identity + menu labels, a centered global search, and window-side actions
 * (theme, notifications, inspector toggle, user). Slim like a native app.
 */
import { motion } from 'framer-motion';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/storage/auth.store';
import { useUIStore } from '@/storage/ui.store';

const openPalette = () => window.dispatchEvent(new Event('eventium:command-palette'));

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={openPalette}
      className="hidden md:inline-flex items-center h-7 px-2 rounded-md text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
    >
      {children}
    </button>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
    >
      {children}
    </button>
  );
}

/** The desktop menu/title bar. */
export function MenuBar() {
  const { isDark, toggle } = useTheme();
  const { unreadCount, toggleOpen } = useNotifications();
  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav);
  const toggleInspector = useUIStore((s) => s.toggleInspector);
  const user = useAuthStore((s) => s.user);
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="relative z-30 flex h-9 shrink-0 items-center gap-1 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-2">
      {/* Left: brand + menus */}
      <button
        type="button"
        onClick={toggleMobileNav}
        aria-label="Menu"
        className="md:hidden w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div className="flex items-center gap-1.5 pl-1 pr-2">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
          <span className="text-white text-[10px] font-black">E</span>
        </div>
        <span className="text-xs font-semibold tracking-tight text-[var(--color-text-primary)]">
          Eventium
        </span>
      </div>
      <MenuLabel>Dosya</MenuLabel>
      <MenuLabel>Görünüm</MenuLabel>
      <MenuLabel>Yardım</MenuLabel>

      {/* Center: global search */}
      <div className="flex-1 flex justify-center px-2">
        <button
          type="button"
          onClick={openPalette}
          className="w-full max-w-md flex items-center gap-2 h-6 px-2.5 rounded-md text-[11px] text-[var(--color-text-tertiary)] bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="truncate">Ara ya da komut çalıştır…</span>
          <kbd className="ml-auto rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] px-1 text-[9px]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-0.5">
        <IconBtn onClick={toggle} label={isDark ? 'Light mode' : 'Dark mode'}>
          {isDark ? (
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M15 9.5A6 6 0 118 2.5a4.5 4.5 0 007 7z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </IconBtn>

        <button
          type="button"
          onClick={toggleOpen}
          aria-label="Notifications"
          className="relative w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
              className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-severity-critical text-white text-[8px] font-bold px-1"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </button>

        <IconBtn onClick={toggleInspector} label="Inspector">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect
              x="1.5"
              y="2"
              width="13"
              height="12"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M10.5 2v12" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </IconBtn>

        <button
          type="button"
          onClick={openPalette}
          title={user ? `${user.name} · ${user.role}` : ''}
          className="ml-1 flex items-center gap-1.5 h-7 pl-1 pr-2 rounded-md hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <span className="w-5 h-5 rounded-md bg-brand-500/15 text-brand-500 flex items-center justify-center text-[10px] font-bold">
            {initial}
          </span>
          <span className="hidden lg:inline text-[11px] text-[var(--color-text-secondary)] max-w-[100px] truncate">
            {user?.name}
          </span>
        </button>
      </div>
    </div>
  );
}
