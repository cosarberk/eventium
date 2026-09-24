/**
 * @fileoverview Bottom status bar (IDE-style) — connection + context + version.
 */
import { useRouterState } from '@tanstack/react-router';
import { useSocket } from '@/hooks/useSocket';
import { useDashboardStore } from '@/storage/dashboard.store';
import { useCanvasStatusStore } from '@/studio/canvas-status.store';
import { titleForPath } from './nav';

/** The status bar pinned to the bottom of the content column. */
export function StatusBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isConnected, isConnecting } = useSocket();
  const canvas = useCanvasStatusStore();
  const projectOpen = useDashboardStore((s) => s.projectOpen);
  const projectName = useDashboardStore((s) => s.activeProject?.name);
  const pageName = useDashboardStore((s) => s.activeDashboard?.name);
  const dirty = useDashboardStore((s) => s.dirty);

  return (
    <footer className="sticky bottom-0 z-10 h-status shrink-0 flex items-center justify-between gap-4 px-3 text-[11px] bg-[var(--color-bg-elevated)] border-t border-[var(--color-border-primary)] text-[var(--color-text-tertiary)]">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-emerald-500' : isConnecting ? 'bg-amber-500' : 'bg-red-500'
            }`}
          />
          {isConnected ? 'Canlı' : isConnecting ? 'Bağlanıyor' : 'Kopuk'}
        </span>
        {projectOpen && projectName ? (
          <span className="hidden sm:flex items-center gap-1.5 truncate">
            <span className="truncate">{projectName}</span>
            {pageName && (
              <>
                <span className="text-[var(--color-text-tertiary)]/60">›</span>
                <span className="truncate text-[var(--color-text-secondary)]">{pageName}</span>
              </>
            )}
            {dirty && (
              <span
                className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
                title="Kaydedilmemiş değişiklik"
              />
            )}
          </span>
        ) : (
          <span className="hidden sm:inline truncate">{titleForPath(path)}</span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {canvas.active && (
          <span className="hidden md:flex items-center gap-2 font-mono">
            {canvas.tool && (
              <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-brand-400">
                {canvas.tool}
              </span>
            )}
            <span className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5">
              {canvas.layoutMode === 'free' ? 'Serbest' : 'Izgara'}
            </span>
            <span>{Math.round(canvas.zoom * 100)}%</span>
            {canvas.selected > 0 && <span>{canvas.selected} seçili</span>}
          </span>
        )}
        <span>Eventium v0.1</span>
      </div>
    </footer>
  );
}
