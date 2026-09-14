/**
 * @fileoverview Console / output tool window.
 * Shows captured runtime log entries (errors, warnings, info) with a clear
 * action. Installs global error capture on mount.
 */
import { useEffect } from 'react';
import { installConsoleCapture, type LogLevel, useConsoleStore } from './console.store';

const LEVEL_STYLE: Record<LogLevel, string> = {
  error: 'text-red-400',
  warn: 'text-amber-400',
  info: 'text-[var(--color-text-secondary)]',
};

function clock(t: number): string {
  return new Date(t).toLocaleTimeString('tr-TR', { hour12: false });
}

/** The console panel. */
export function ConsolePanel() {
  const entries = useConsoleStore((s) => s.entries);
  const clear = useConsoleStore((s) => s.clear);

  useEffect(() => {
    installConsoleCapture();
  }, []);

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border-primary)] px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Konsol · {entries.length}
        </span>
        <button
          type="button"
          onClick={clear}
          className="rounded px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          Temizle
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2 font-mono text-[11px] leading-relaxed">
        {entries.length === 0 ? (
          <p className="text-[var(--color-text-tertiary)]">Çıktı yok.</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="flex gap-2">
              <span className="shrink-0 text-[var(--color-text-tertiary)]">{clock(e.time)}</span>
              <span
                className={`min-w-0 flex-1 whitespace-pre-wrap break-words ${LEVEL_STYLE[e.level]}`}
              >
                {e.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
