/**
 * @fileoverview Bottom status bar (IDE-style) — connection + context + version.
 */
import { useRouterState } from '@tanstack/react-router';
import { useSocket } from '@/hooks/useSocket';
import { titleForPath } from './nav';

/** The status bar pinned to the bottom of the content column. */
export function StatusBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isConnected, isConnecting } = useSocket();

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
        <span className="hidden sm:inline truncate">{titleForPath(path)}</span>
      </div>
      <span className="shrink-0">Eventium v0.1</span>
    </footer>
  );
}
