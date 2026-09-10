/**
 * @fileoverview Right inspector dock — a resizable, collapsible properties pane
 * (desktop). Drag its left edge to resize. Content is contextual; for now it
 * shows a placeholder until the canvas/panel editor (Faz 2) fills it.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useUIStore } from '@/storage/ui.store';

/** The inspector dock. */
export function Inspector() {
  const open = useUIStore((s) => s.inspectorOpen);
  const width = useUIStore((s) => s.inspectorWidth);
  const setWidth = useUIStore((s) => s.setInspectorWidth);
  const toggle = useUIStore((s) => s.toggleInspector);
  const dragging = useRef(false);

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current) return;
      setWidth(window.innerWidth - e.clientX);
    },
    [setWidth],
  );

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

  if (!open) return null;

  return (
    <aside
      className="hidden md:flex shrink-0 flex-col border-l border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] relative"
      style={{ width }}
    >
      {/* Resize handle */}
      <button
        type="button"
        aria-label="Resize inspector"
        onPointerDown={(e) => {
          dragging.current = true;
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
          e.preventDefault();
        }}
        className="absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-col-resize hover:bg-brand-500/40 transition-colors"
      />
      <div className="flex items-center justify-between h-9 px-3 border-b border-[var(--color-border-primary)] shrink-0">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">Inspector</span>
        <button
          type="button"
          onClick={toggle}
          aria-label="Close inspector"
          className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
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
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-10">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] flex items-center justify-center text-[var(--color-text-tertiary)]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M3 9l6 6 6-6M9 15V3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] max-w-[200px]">
            Bir panel/öğe seçtiğinde özellikleri burada düzenlenecek.
          </p>
        </div>
      </div>
    </aside>
  );
}
