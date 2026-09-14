/**
 * @fileoverview Outline / Layers tool window.
 *
 * A tree of the page's controls (like a Solution Explorer / Layers panel):
 * select, rename inline, reorder (z-order), and delete. Reads/writes the
 * dashboard store; selection is shared with the canvas and Inspector.
 */
import { useState } from 'react';
import { getComponent } from '@/components/design/registry';
import { useDashboardStore } from '@/storage/dashboard.store';

/** The outline / layers panel. */
export function OutlinePanel() {
  const activeDashboard = useDashboardStore((s) => s.activeDashboard);
  const selectedId = useDashboardStore((s) => s.selectedBlockId);
  const selectBlock = useDashboardStore((s) => s.selectBlock);
  const removeBlock = useDashboardStore((s) => s.removeBlock);
  const updateBlockTitle = useDashboardStore((s) => s.updateBlockTitle);
  const reorderBlock = useDashboardStore((s) => s.reorderBlock);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const blocks = activeDashboard?.blocks ?? [];
  // Topmost paint order first (matches z-order: later = on top).
  const ordered = [...blocks].reverse();

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-secondary)]">
      <div className="border-b border-[var(--color-border-primary)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
        Anahat · {blocks.length} öğe
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-1.5">
        {ordered.length === 0 && (
          <p className="px-2 py-4 text-center text-[11px] text-[var(--color-text-tertiary)]">
            Henüz bileşen yok.
          </p>
        )}
        {ordered.map((b) => {
          const descriptor = getComponent(b.componentType)?.descriptor;
          const selected = b.id === selectedId;
          return (
            <div
              key={b.id}
              className={`group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors ${
                selected
                  ? 'bg-brand-500/15 text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <span className="w-4 shrink-0 text-center text-[13px] leading-none">
                {descriptor?.icon ?? '▫'}
              </span>
              {renaming === b.id ? (
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    updateBlockTitle(b.id, draft.trim() || b.title);
                    setRenaming(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateBlockTitle(b.id, draft.trim() || b.title);
                      setRenaming(null);
                    }
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  className="min-w-0 flex-1 rounded border border-brand-500 bg-[var(--color-bg-primary)] px-1 py-0.5 text-xs outline-none"
                  // biome-ignore lint/a11y/noAutofocus: inline rename should focus immediately
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => selectBlock(b.id)}
                  onDoubleClick={() => {
                    setDraft(b.title);
                    setRenaming(b.id);
                  }}
                  className="min-w-0 flex-1 truncate text-left"
                >
                  {b.title || b.componentType}
                </button>
              )}
              <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => reorderBlock(b.id, 1)}
                  aria-label="Öne getir"
                  title="Öne getir"
                  className="px-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => reorderBlock(b.id, -1)}
                  aria-label="Arkaya gönder"
                  title="Arkaya gönder"
                  className="px-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(b.id)}
                  aria-label="Sil"
                  title="Sil"
                  className="px-1 text-[var(--color-text-tertiary)] hover:text-red-500"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
