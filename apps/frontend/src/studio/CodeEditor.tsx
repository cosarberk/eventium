/**
 * @fileoverview Code view (code-behind) for a single control — a document buffer.
 *
 * Visual Studio-style: the designer and this code view are separate documents.
 * Edits the block's `options.code`. A control's Blueprint is a *separate* buffer,
 * reachable from here (open as a tab, or split into a new tab group).
 */
import { useDashboardStore } from '@/storage/dashboard.store';
import type { DashboardBlock } from '@/types';
import { bufferId, useWorkspaceStore } from './workspace.store';

const CODE_RENDERED = new Set(['custom-html', 'custom-react']);

/** The code-behind editor for one block. */
export function CodeEditor({ block }: { block: DashboardBlock }) {
  const updateBlockOptions = useDashboardStore((s) => s.updateBlockOptions);
  const openBuffer = useWorkspaceStore((s) => s.openBuffer);

  const code = typeof block.options.code === 'string' ? block.options.code : '';
  const isRenderCode = CODE_RENDERED.has(block.componentType);
  const language = block.componentType === 'custom-react' ? 'React / JSX' : 'HTML / JS';

  const openBlueprint = (split: boolean) =>
    openBuffer(
      {
        id: bufferId('blueprint', block.id),
        kind: 'blueprint',
        blockId: block.id,
        title: `${block.title || block.componentType} · Blueprint`,
      },
      { split },
    );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-primary)] px-3 py-1.5">
        <span className="truncate text-[11px] text-[var(--color-text-tertiary)]">
          {isRenderCode
            ? `${language} — window.EVENTIUM.data ile bağlı veriye eriş`
            : 'Mantık / script (options.code)'}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openBlueprint(false)}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            Blueprint
          </button>
          <button
            type="button"
            onClick={() => openBlueprint(true)}
            title="Blueprint'i yan sekme grubunda aç"
            className="rounded-md px-1.5 py-1 text-[13px] leading-none text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            ⇹
          </button>
        </div>
      </div>
      <textarea
        value={code}
        onChange={(e) => updateBlockOptions(block.id, { ...block.options, code: e.target.value })}
        spellCheck={false}
        placeholder={'function App() {\n  const data = window.EVENTIUM.data || [];\n  // ...\n}'}
        className="min-h-0 flex-1 resize-none bg-[var(--color-bg-primary)] p-3 font-mono text-[12px] leading-relaxed text-[var(--color-text-primary)] outline-none"
      />
    </div>
  );
}
