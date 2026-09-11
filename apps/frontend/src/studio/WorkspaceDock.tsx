/**
 * @fileoverview Bottom workspace dock — the VS Code-style panel.
 *
 * Sits below the document area and above the status bar. Collapsible to a slim
 * tab strip and resizable by dragging its top edge. Hosts tabbed tool views:
 * runtime variables today, with room for data/console/blueprint panes. Its state
 * (open tab, height, collapsed) persists per browser.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { VariableBar } from '@/components/design/VariableBar';

/** A dock tab. */
interface DockTab {
  id: string;
  label: string;
  icon: string;
}

const TABS: DockTab[] = [
  { id: 'vars', label: 'Değişkenler', icon: '𝑥' },
  { id: 'tools', label: 'Araçlar', icon: '⚙' },
];

const STORAGE_KEY = 'eventium-dock';
const MIN_H = 120;

/** Persisted dock state. */
interface DockState {
  collapsed: boolean;
  height: number;
  tab: string;
}

function loadState(): DockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { collapsed: true, height: 220, tab: 'vars', ...JSON.parse(raw) };
  } catch {
    // ignore unavailable/blocked storage
  }
  return { collapsed: true, height: 220, tab: 'vars' };
}

/** Fire a window event that an overlay (palette/query/blueprint) listens for. */
function emit(name: string) {
  window.dispatchEvent(new Event(name));
}

/** The bottom dock. */
export function WorkspaceDock() {
  const [state, setState] = useState<DockState>(loadState);
  const { collapsed, height, tab } = state;
  const dragging = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const patch = (p: Partial<DockState>) => setState((s) => ({ ...s, ...p }));

  const onMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const max = window.innerHeight * 0.7;
    const next = Math.max(MIN_H, Math.min(max, window.innerHeight - e.clientY - 24));
    setState((s) => ({ ...s, height: next }));
  }, []);
  const stop = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);
  useEffect(() => {
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
    };
  }, [onMove, stop]);

  /** Click a tab: expand if collapsed, else toggle collapse when re-clicking. */
  const onTab = (id: string) => {
    if (collapsed) patch({ collapsed: false, tab: id });
    else if (id === tab) patch({ collapsed: true });
    else patch({ tab: id });
  };

  return (
    <div className="hidden md:flex shrink-0 flex-col border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
      {/* Resize handle (only when open) */}
      {!collapsed && (
        <button
          type="button"
          aria-label="Dock boyutlandır"
          onPointerDown={(e) => {
            dragging.current = true;
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
          }}
          className="h-1 w-full cursor-row-resize hover:bg-brand-500/40 transition-colors"
        />
      )}

      {/* Tab strip */}
      <div className="flex items-center gap-1 px-2 h-9 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              !collapsed && tab === t.id
                ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span className="text-[13px] leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => patch({ collapsed: !collapsed })}
          aria-label={collapsed ? 'Paneli aç' : 'Paneli kapat'}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
            className={collapsed ? '' : 'rotate-180'}
          >
            <path
              d="M3 7.5L6 4.5l3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div
          className="overflow-auto border-t border-[var(--color-border-primary)] p-3"
          style={{ height }}
        >
          {tab === 'vars' && <VariableBar />}
          {tab === 'tools' && (
            <div className="flex flex-wrap gap-2">
              <DockAction
                label="Blueprint"
                hint="Görsel dataflow"
                onClick={() => emit('eventium:blueprint')}
              />
              <DockAction
                label="Query Builder"
                hint="Veri sorgu kur"
                onClick={() => emit('eventium:query-builder')}
              />
              <DockAction
                label="Komut Paleti"
                hint="⌘K"
                onClick={() => emit('eventium:command-palette')}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** A labelled tool button in the dock's Araçlar tab. */
function DockAction({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-0.5 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-3 py-2 text-left transition-colors hover:border-brand-500/50 hover:bg-[var(--color-surface-hover)]"
    >
      <span className="text-xs font-semibold text-[var(--color-text-primary)]">{label}</span>
      <span className="text-[10px] text-[var(--color-text-tertiary)]">{hint}</span>
    </button>
  );
}
