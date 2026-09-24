/**
 * @fileoverview Keyboard shortcuts help — a reference overlay for the studio's
 * shortcuts. Opened from the Yardım menu, or with `?` / `⌘/`.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Shortcut {
  keys: string[];
  label: string;
}

const GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: 'Genel',
    items: [
      { keys: ['⌘', 'K'], label: 'Komut paleti' },
      { keys: ['⌘', 'S'], label: 'Kaydet' },
      { keys: ['F5'], label: 'Çalıştır (önizleme)' },
      { keys: ['⌘', 'Z'], label: 'Geri al' },
      { keys: ['⌘', '⇧', 'Z'], label: 'Yinele' },
      { keys: ['?'], label: 'Bu yardım' },
      { keys: ['Esc'], label: 'Kapat / iptal' },
    ],
  },
  {
    title: 'Tuval araçları',
    items: [
      { keys: ['V'], label: 'Seç / Taşı' },
      { keys: ['H'], label: 'El (kaydır)' },
      { keys: ['Z'], label: 'Yakınlaştır' },
      { keys: ['T'], label: 'Metin' },
      { keys: ['R'], label: 'Şekil' },
    ],
  },
  {
    title: 'Tuval',
    items: [
      { keys: ['Space', '/', 'Alt', '+ sürükle'], label: 'Kaydır' },
      { keys: ['⌘', '+ tekerlek'], label: 'Yakınlaştır' },
      { keys: ['⌘', 'D'], label: 'Çoğalt' },
      { keys: ['⌘', 'C', '/', 'V'], label: 'Kopyala / yapıştır' },
      { keys: ['Del'], label: 'Sil' },
      { keys: ['Shift', '+ tık'], label: 'Çoklu seçim' },
    ],
  },
];

/** Keyboard-key pill. */
function K({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
      {children}
    </kbd>
  );
}

/** App-wide shortcuts help overlay (mounted once). */
export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      const t = e.target as HTMLElement | null;
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (typing) return;
      if (e.key === '?' || ((e.metaKey || e.ctrlKey) && e.key === '/')) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('eventium:shortcuts', onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('eventium:shortcuts', onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[96] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Kapat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border-primary)] px-5 py-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Klavye kısayolları
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M3.5 3.5l7 7M10.5 3.5l-7 7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="grid max-h-[70vh] grid-cols-1 gap-x-8 gap-y-5 overflow-auto p-5 sm:grid-cols-2">
              {GROUPS.map((g) => (
                <div key={g.title}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                    {g.title}
                  </p>
                  <ul className="space-y-1.5">
                    {g.items.map((s) => (
                      <li key={s.label} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-[var(--color-text-secondary)]">{s.label}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          {s.keys.map((k, i) =>
                            k === '/' || k.startsWith('+') ? (
                              // biome-ignore lint/suspicious/noArrayIndexKey: static list
                              <span
                                key={i}
                                className="text-[10px] text-[var(--color-text-tertiary)]"
                              >
                                {k}
                              </span>
                            ) : (
                              // biome-ignore lint/suspicious/noArrayIndexKey: static list
                              <K key={i}>{k}</K>
                            ),
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
