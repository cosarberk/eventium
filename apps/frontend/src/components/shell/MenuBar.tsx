/**
 * @fileoverview Top menu/title bar — desktop-app chrome.
 *
 * App identity + real dropdown menus (Dosya / Düzen / Görünüm / Yardım) that run
 * actual commands, a centered global search, and window-side actions (theme,
 * notifications, user). Slim like a native app. Commands that belong to the open
 * project's editor are dispatched as window events the studio dock listens for.
 */
import { useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/storage/auth.store';
import { useDashboardStore } from '@/storage/dashboard.store';
import { useUIStore } from '@/storage/ui.store';
import { useCanvasPrefsStore } from '@/studio/canvas-prefs.store';

const emit = (name: string, detail?: string) =>
  window.dispatchEvent(detail === undefined ? new Event(name) : new CustomEvent(name, { detail }));

const openPalette = () => emit('eventium:command-palette');

/** One entry in a dropdown menu. */
type MenuEntry =
  | { kind: 'sep' }
  | {
      kind: 'item';
      label: string;
      shortcut?: string;
      onClick: () => void;
      disabled?: boolean;
    };

/** A single dropdown menu (label + its panel). */
function Menu({
  id,
  label,
  entries,
  open,
  setOpen,
}: {
  id: string;
  label: string;
  entries: MenuEntry[];
  open: string | null;
  setOpen: (id: string | null) => void;
}) {
  const isOpen = open === id;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(isOpen ? null : id)}
        onMouseEnter={() => open && setOpen(id)}
        className={`hidden md:inline-flex h-7 items-center rounded-md px-2 text-xs transition-colors ${
          isOpen
            ? 'bg-[var(--color-surface-active)] text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
        }`}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-40 mt-0.5 min-w-[200px] rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] py-1 shadow-xl">
          {entries.map((e, i) =>
            e.kind === 'sep' ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: static menu structure
              <div key={i} className="my-1 h-px bg-[var(--color-border-primary)]" />
            ) : (
              <button
                key={e.label}
                type="button"
                disabled={e.disabled}
                onClick={() => {
                  setOpen(null);
                  e.onClick();
                }}
                className="flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-40"
              >
                <span>{e.label}</span>
                {e.shortcut && (
                  <span className="font-mono text-[10px] text-[var(--color-text-tertiary)]">
                    {e.shortcut}
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      )}
    </div>
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
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const { unreadCount, toggleOpen } = useNotifications();
  const user = useAuthStore((s) => s.user);
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  const toggleMobileNav = useUIStore((s) => s.toggleMobileNav);
  const projectOpen = useDashboardStore((s) => s.projectOpen);
  const closeProject = useDashboardStore((s) => s.closeProject);
  const undo = useDashboardStore((s) => s.undo);
  const redo = useDashboardStore((s) => s.redo);
  const canUndo = useDashboardStore((s) => s.past.length > 0);
  const canRedo = useDashboardStore((s) => s.future.length > 0);
  const gridVisible = useCanvasPrefsStore((s) => s.gridVisible);
  const toggleGrid = useCanvasPrefsStore((s) => s.toggleGrid);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  // Close menus on outside click / Escape.
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenMenu(null);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  const backToStart = () => {
    closeProject();
    navigate({ to: '/' });
  };

  const panelItem = (label: string, panelId: string): MenuEntry => ({
    kind: 'item',
    label,
    disabled: !projectOpen,
    onClick: () => emit('eventium:open-panel', panelId),
  });

  const menus: { id: string; label: string; entries: MenuEntry[] }[] = [
    {
      id: 'file',
      label: 'Dosya',
      entries: [
        {
          kind: 'item',
          label: 'Yeni proje…',
          shortcut: '⌘N',
          onClick: () => navigate({ to: '/new' }),
        },
        {
          kind: 'item',
          label: 'Yeni dosya…',
          disabled: !projectOpen,
          onClick: () => window.dispatchEvent(new CustomEvent('eventium:new-file', { detail: '' })),
        },
        { kind: 'item', label: 'Proje aç…', onClick: backToStart },
        { kind: 'sep' },
        {
          kind: 'item',
          label: 'Kaydet',
          shortcut: '⌘S',
          disabled: !projectOpen,
          onClick: () => emit('eventium:save'),
        },
        {
          kind: 'item',
          label: 'Başlangıç ekranı',
          disabled: !projectOpen,
          onClick: backToStart,
        },
      ],
    },
    {
      id: 'edit',
      label: 'Düzen',
      entries: [
        { kind: 'item', label: 'Geri al', shortcut: '⌘Z', disabled: !canUndo, onClick: undo },
        { kind: 'item', label: 'Yinele', shortcut: '⌘⇧Z', disabled: !canRedo, onClick: redo },
      ],
    },
    {
      id: 'view',
      label: 'Görünüm',
      entries: [
        {
          kind: 'item',
          label: isDark ? 'Aydınlık tema' : 'Karanlık tema',
          onClick: toggle,
        },
        {
          kind: 'item',
          label: `${gridVisible ? '✓ ' : ''}Kare ızgara`,
          disabled: !projectOpen,
          onClick: toggleGrid,
        },
        { kind: 'item', label: 'Komut paleti', shortcut: '⌘K', onClick: openPalette },
        { kind: 'sep' },
        panelItem('Araç Kutusu', 'toolbox'),
        panelItem('Anahat', 'outline'),
        panelItem('Özellikler', 'properties'),
        panelItem('Veri & Kaynaklar', 'data'),
        panelItem('Sorunlar', 'problems'),
        panelItem('Konsol', 'console'),
        panelItem('Önizleme', 'preview'),
        panelItem('Proje Kaynağı', 'source'),
        { kind: 'sep' },
        {
          kind: 'item',
          label: 'Yerleşimi sıfırla',
          disabled: !projectOpen,
          onClick: () => emit('eventium:reset-layout'),
        },
      ],
    },
    {
      id: 'help',
      label: 'Yardım',
      entries: [
        { kind: 'item', label: 'Komut paleti', shortcut: '⌘K', onClick: openPalette },
        {
          kind: 'item',
          label: 'Hakkında',
          onClick: () => toast.info('Eventium Studio · v0.1'),
        },
      ],
    },
  ];

  return (
    <div
      ref={barRef}
      className="relative z-40 flex h-9 shrink-0 items-center gap-0.5 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-2"
    >
      {/* Left: brand + menus */}
      <button
        type="button"
        onClick={toggleMobileNav}
        aria-label="Menü"
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
        <span className="hidden sm:inline text-xs font-semibold tracking-tight text-[var(--color-text-primary)]">
          Eventium
        </span>
      </div>
      {menus.map((m) => (
        <Menu
          key={m.id}
          id={m.id}
          label={m.label}
          entries={m.entries}
          open={openMenu}
          setOpen={setOpenMenu}
        />
      ))}

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
        <IconBtn onClick={toggle} label={isDark ? 'Aydınlık tema' : 'Karanlık tema'}>
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
          aria-label="Bildirimler"
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
