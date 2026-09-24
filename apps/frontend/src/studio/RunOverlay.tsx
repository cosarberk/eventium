/**
 * @fileoverview Run overlay — a distraction-free, full-screen preview of the
 * active page as end-users see it (read-only, live data, no editor chrome).
 *
 * Opened by the `eventium:run` window event (or F5 in the editor). A slim top
 * bar shows the project/page and a device-width toggle; the page renders through
 * the same read-only canvas the broadcast/TV view uses.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useProjectTheme } from '@/hooks/useProjectTheme';
import { useDashboardStore } from '@/storage/dashboard.store';
import { CanvasSurface } from './CanvasSurface';

type Device = 'full' | 'tablet' | 'phone';

const WIDTHS: Record<Device, number | null> = { full: null, tablet: 834, phone: 402 };

/** App-wide Run overlay (mounted once). */
export function RunOverlay() {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Device>('full');
  const projectId = useDashboardStore((s) => s.activeProject?.id);
  const projectName = useDashboardStore((s) => s.activeProject?.name);
  const pageName = useDashboardStore((s) => s.activeDashboard?.name);
  const projectOpen = useDashboardStore((s) => s.projectOpen);
  const themeCss = useProjectTheme(projectId);

  useEffect(() => {
    const onRun = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      // F5 runs the page when a project is open and focus isn't in a field.
      if (e.key === 'F5' && useDashboardStore.getState().projectOpen) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('eventium:run', onRun);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('eventium:run', onRun);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Close if the project is closed while running.
  useEffect(() => {
    if (!projectOpen) setOpen(false);
  }, [projectOpen]);

  const width = WIDTHS[device];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex flex-col bg-[var(--color-bg-sunken)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Top bar */}
          <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M3.5 2.5l5 3.5-5 3.5v-7z" fill="currentColor" />
                </svg>
              </span>
              <span className="font-medium text-[var(--color-text-primary)]">{projectName}</span>
              {pageName && (
                <>
                  <span className="text-[var(--color-text-tertiary)]/60">›</span>
                  <span className="text-[var(--color-text-secondary)]">{pageName}</span>
                </>
              )}
              <span className="ml-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                Çalışıyor
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-lg bg-[var(--color-bg-tertiary)] p-0.5">
                {(['full', 'tablet', 'phone'] as Device[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDevice(d)}
                    title={d === 'full' ? 'Tam genişlik' : d === 'tablet' ? 'Tablet' : 'Telefon'}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      device === d
                        ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm'
                        : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {d === 'full' ? 'Tam' : d === 'tablet' ? 'Tablet' : 'Telefon'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M3 3l6 6M9 3l-6 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Kapat
                <kbd className="rounded bg-[var(--color-bg-primary)] px-1 text-[9px]">Esc</kbd>
              </button>
            </div>
          </div>

          {/* Rendered page (read-only, live) — the active theme, if any, is
              injected scoped to this preview. */}
          {themeCss && (
            // biome-ignore lint/security/noDangerouslySetInnerHtml: project theme CSS variables, scoped
            <style dangerouslySetInnerHTML={{ __html: `.eventium-themed{${themeCss}}` }} />
          )}
          <div className="flex min-h-0 flex-1 justify-center overflow-auto p-4">
            <div
              className="eventium-themed h-full w-full overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] shadow-xl"
              style={width ? { maxWidth: width } : undefined}
            >
              <CanvasSurface editing={false} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
