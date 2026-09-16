/**
 * @fileoverview Command palette (⌘K / Ctrl+K) — keyboard-first launcher.
 * Overlays the page (never squeezes). Role-aware navigation + account + theme
 * actions, filtered by text, navigable with arrows + Enter.
 */
import { useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNodes } from '@/hooks/useNodes';
import { hasRole, type Role, usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';
import { useDashboardStore } from '@/storage/dashboard.store';
import { useCanvasPrefsStore } from '@/studio/canvas-prefs.store';
import { fileLabel } from '@/studio/file-types';

const emit = (name: string, detail?: string) =>
  window.dispatchEvent(detail === undefined ? new Event(name) : new CustomEvent(name, { detail }));

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
  const toggleGrid = useCanvasPrefsStore((s) => s.toggleGrid);
  const projectOpen = useDashboardStore((s) => s.projectOpen);
  const activeProject = useDashboardStore((s) => s.activeProject);
  const openPage = useDashboardStore((s) => s.openPage);
  const closeProject = useDashboardStore((s) => s.closeProject);
  const { nodes } = useNodes(activeProject?.id);
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

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];

    // ── Dosya ──
    list.push({
      id: 'new-project',
      group: 'Dosya',
      label: 'Yeni proje…',
      run: () => navigate({ to: '/new' }),
    });
    if (projectOpen) {
      list.push({
        id: 'new-file',
        group: 'Dosya',
        label: 'Yeni dosya…',
        run: () => emit('eventium:new-file', ''),
      });
      list.push({ id: 'save', group: 'Dosya', label: 'Kaydet', run: () => emit('eventium:save') });
      list.push({
        id: 'to-start',
        group: 'Dosya',
        label: 'Başlangıç ekranı',
        run: () => {
          closeProject();
          navigate({ to: '/' });
        },
      });
    }

    // ── Sayfalara / dosyalara atla ──
    if (projectOpen && activeProject) {
      for (const p of activeProject.pages) {
        list.push({
          id: `page-${p.id}`,
          group: 'Aç',
          label: `📄 ${p.name}`,
          run: () => openPage(p),
        });
      }
      for (const n of nodes) {
        if (n.kind === 'page' || n.kind === 'folder') continue;
        list.push({
          id: `file-${n.id}`,
          group: 'Aç',
          label: fileLabel(n.kind, n.name),
          run: () =>
            emit('eventium:open-file', JSON.stringify({ id: n.id, kind: n.kind, name: n.name })),
        });
      }
    }

    // ── Görünüm ──
    if (projectOpen) {
      for (const [pid, label] of [
        ['design', 'Tasarım'],
        ['data', 'Veri'],
        ['logic', 'Mantık'],
        ['preview', 'Önizleme'],
      ] as const) {
        list.push({
          id: `persp-${pid}`,
          group: 'Perspektif',
          label,
          run: () => emit('eventium:perspective', pid),
        });
      }
      for (const [panel, label] of [
        ['explorer', 'Proje'],
        ['toolbox', 'Araç Kutusu'],
        ['outline', 'Anahat'],
        ['properties', 'Özellikler'],
        ['data', 'Veri & Kaynaklar'],
        ['problems', 'Sorunlar'],
        ['console', 'Konsol'],
        ['preview', 'Önizleme'],
        ['source', 'Proje Kaynağı'],
      ] as const) {
        list.push({
          id: `panel-${panel}`,
          group: 'Panel',
          label,
          run: () => emit('eventium:open-panel', panel),
        });
      }
      list.push({
        id: 'run',
        group: 'Dosya',
        label: 'Çalıştır (önizleme)',
        run: () => emit('eventium:run'),
      });
      list.push({
        id: 'blueprint',
        group: 'Görünüm',
        label: 'Blueprint',
        run: () => emit('eventium:blueprint'),
      });
      list.push({
        id: 'grid',
        group: 'Görünüm',
        label: 'Kare ızgara (aç/kapa)',
        run: () => toggleGrid(),
      });
    }
    list.push({
      id: 'toggle-theme',
      group: 'Görünüm',
      label: 'Tema değiştir',
      run: () => toggleTheme(),
    });

    // ── Git ──
    const nav: Command[] = [
      {
        id: 'go-plugins',
        group: 'Git',
        label: 'Eklentiler',
        minRole: 'EDITOR',
        run: () => navigate({ to: '/plugins' }),
      },
      { id: 'go-live', group: 'Git', label: 'Canlı / TV', run: () => navigate({ to: '/live' }) },
      {
        id: 'go-links',
        group: 'Git',
        label: 'Linklerim',
        minRole: 'EDITOR',
        run: () => navigate({ to: '/links' }),
      },
      {
        id: 'go-users',
        group: 'Git',
        label: 'Kullanıcılar',
        minRole: 'ADMIN',
        run: () => navigate({ to: '/users' }),
      },
      {
        id: 'go-settings',
        group: 'Git',
        label: 'Ayarlar',
        run: () => navigate({ to: '/settings' }),
      },
    ];
    list.push(...nav);

    // ── Hesap ──
    list.push({
      id: 'change-password',
      group: 'Hesap',
      label: 'Şifre değiştir',
      run: () => navigate({ to: '/change-password' }),
    });
    list.push({
      id: 'logout',
      group: 'Hesap',
      label: 'Çıkış yap',
      run: () => {
        void logout().then(() => navigate({ to: '/login' }));
      },
    });

    return list.filter((c) => !c.minRole || hasRole(role, c.minRole));
  }, [
    navigate,
    logout,
    role,
    toggleTheme,
    toggleGrid,
    projectOpen,
    activeProject,
    openPage,
    closeProject,
    nodes,
  ]);

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
