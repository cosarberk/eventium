/**
 * @fileoverview Per-component editor pane (Visual Studio / Unreal style).
 *
 * Double-clicking a component on the canvas opens this pane beside it as a
 * split. It edits *that* component's logic: a **Kod** tab (the component's code
 * slot — the render code for custom HTML/React panels, or a logic script for
 * others) and a **Blueprint** tab (visual logic). Closing returns to the canvas.
 */
import { useState } from 'react';
import { useDashboardStore } from '@/storage/dashboard.store';
import type { DashboardBlock } from '@/types';

/** Component types whose `code` option is the actual render code. */
const CODE_RENDERED = new Set(['custom-html', 'custom-react']);

/** Fire the window event the Blueprint overlay listens for. */
function openBlueprint() {
  window.dispatchEvent(new Event('eventium:blueprint'));
}

interface ComponentEditorPaneProps {
  /** The block being edited. */
  block: DashboardBlock;
  /** Close the pane (back to canvas only). */
  onClose: () => void;
}

/** The split editor pane for a single component. */
export function ComponentEditorPane({ block, onClose }: ComponentEditorPaneProps) {
  const updateBlockOptions = useDashboardStore((s) => s.updateBlockOptions);
  const [tab, setTab] = useState<'code' | 'blueprint'>('code');

  const code = typeof block.options.code === 'string' ? block.options.code : '';
  const isRenderCode = CODE_RENDERED.has(block.componentType);
  const language = block.componentType === 'custom-react' ? 'React / JSX' : 'HTML / JS';

  const setCode = (value: string) => {
    updateBlockOptions(block.id, { ...block.options, code: value });
  };

  return (
    <aside className="flex min-h-[60vh] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-primary)] px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {block.title || block.componentType}
          </p>
          <p className="text-[10px] text-[var(--color-text-tertiary)]">
            {block.componentType} · logic editor
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Editörü kapat"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M9 3L3 9M3 3l6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border-primary)] px-2 py-1.5">
        {(
          [
            { id: 'code', label: 'Kod' },
            { id: 'blueprint', label: 'Blueprint' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              tab === t.id
                ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'code' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <p className="px-3 pt-2 text-[10px] text-[var(--color-text-tertiary)]">
            {isRenderCode
              ? `${language} — bu kod paneli render eder. window.EVENTIUM.data ile bağlı veriye eriş.`
              : 'Bu bileşen için mantık/script (options.code). Blueprint ile de bağlayabilirsin.'}
          </p>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder={
              'function App() {\n  const data = window.EVENTIUM.data || [];\n  // ...\n}'
            }
            className="m-3 min-h-0 flex-1 resize-none rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-2.5 font-mono text-[12px] leading-relaxed text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="text-3xl">🔗</span>
          <p className="max-w-xs text-xs text-[var(--color-text-tertiary)]">
            Görsel mantığı Blueprint editöründe kur: kaynak → transform → bu panel. Çalıştır ve
            board'a bas.
          </p>
          <button
            type="button"
            onClick={openBlueprint}
            className="rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Blueprint editörünü aç
          </button>
        </div>
      )}
    </aside>
  );
}
