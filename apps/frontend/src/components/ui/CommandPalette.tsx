/**
 * @fileoverview Command palette (⌘K / Ctrl+K) — keyboard-first launcher.
 * Overlays the page (never squeezes). Role-aware navigation + account + theme
 * actions, filtered by text, navigable with arrows + Enter.
 */
import { useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { hasRole, type Role, usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';

/** A runnable command. */
interface Command {
  id: string;
  label: string;
  group: string;
  minRole?: Role;
  run: () => void;
}

/** Keyboard-key pill. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-tertiary)]">
      {children}
    </kbd>
  );
}

/** Global command palette. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { role } = usePermissions();
  const { toggle: toggleTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('eventium:command-palette', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('eventium:command-palette', onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  const commands = useMemo<Command[]>(
    () =>
      (
        [
          { id: 'go-home', group: 'Go to', label: 'Home', run: () => navigate({ to: '/' }) },
          {
            id: 'go-boards',
            group: 'Go to',
            label: 'Boards',
            run: () => navigate({ to: '/boards' }),
          },
          {
            id: 'go-links',
            group: 'Go to',
            label: 'Linklerim',
            minRole: 'EDITOR',
            run: () => navigate({ to: '/links' }),
          },
          {
            id: 'go-plugins',
            group: 'Go to',
            label: 'Plugins',
            minRole: 'EDITOR',
            run: () => navigate({ to: '/plugins' }),
          },
          {
            id: 'go-live',
            group: 'Go to',
            label: 'Live View',
            run: () => navigate({ to: '/live' }),
          },
          {
            id: 'go-users',
            group: 'Go to',
            label: 'Users',
            minRole: 'ADMIN',
            run: () => navigate({ to: '/users' }),
          },
          {
            id: 'go-settings',
            group: 'Go to',
            label: 'Settings',
            run: () => navigate({ to: '/settings' }),
          },
          {
            id: 'query-builder',
            group: 'Actions',
            label: 'Query Builder',
            run: () => window.dispatchEvent(new Event('eventium:query-builder')),
          },
          {
            id: 'blueprint',
            group: 'Actions',
            label: 'Blueprint (node editor)',
            run: () => window.dispatchEvent(new Event('eventium:blueprint')),
          },
          { id: 'toggle-theme', group: 'Actions', label: 'Toggle theme', run: () => toggleTheme() },
          {
            id: 'change-password',
            group: 'Account',
            label: 'Change password',
            run: () => navigate({ to: '/change-password' }),
          },
          {
            id: 'logout',
            group: 'Account',
            label: 'Log out',
            run: () => {
              void logout().then(() => navigate({ to: '/login' }));
            },
          },
        ] as Command[]
      ).filter((c) => !c.minRole || hasRole(role, c.minRole)),
    [navigate, logout, role, toggleTheme],
  );

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(s) || c.group.toLowerCase().includes(s),
    );
  }, [query, commands]);

  const run = useCallback((c: Command | undefined) => {
    if (!c) return;
    setOpen(false);
    c.run();
  }, []);

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(filtered[active]);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <button
            type="button"
            aria-label="Close command palette"
            className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="relative w-full max-w-lg rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-xl overflow-hidden"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.14 }}
          >
            <div className="flex items-center gap-2 px-4 border-b border-[var(--color-border-primary)]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="text-[var(--color-text-tertiary)] shrink-0"
              >
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M11 11l3 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                placeholder="Komut ara ya da bir yere git…"
                className="w-full bg-transparent py-3.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none"
              />
              <Kbd>Esc</Kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--color-text-tertiary)]">
                  Sonuç yok
                </p>
              ) : (
                filtered.map((c, i) => {
                  const isActive = i === active;
                  const showGroup = i === 0 || filtered[i - 1]?.group !== c.group;
                  return (
                    <div key={c.id}>
                      {showGroup && (
                        <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                          {c.group}
                        </p>
                      )}
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => run(c)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          isActive
                            ? 'bg-brand-500/10 text-brand-500'
                            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                      >
                        <span>{c.label}</span>
                        {isActive && <Kbd>↵</Kbd>}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
