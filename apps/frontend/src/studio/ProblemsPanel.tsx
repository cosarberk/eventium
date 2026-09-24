/**
 * @fileoverview Problems tool window.
 * Validates the active page's controls — required slots left unbound, malformed
 * binding refs — and lets the user jump to the offending control. The problem
 * count lives on the dock tab (a coloured badge), so this panel carries no
 * redundant title header.
 */
import { useDashboardStore } from '@/storage/dashboard.store';
import { PanelEmpty } from './PanelEmpty';
import { usePageProblems } from './usePageProblems';

/** The problems panel. */
export function ProblemsPanel() {
  const selectBlock = useDashboardStore((s) => s.selectBlock);
  const { problems } = usePageProblems();

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-secondary)]">
      <div className="min-h-0 flex-1 overflow-auto p-1.5 text-xs">
        {problems.length === 0 ? (
          <PanelEmpty icon="✓" text="Sorun yok. Zorunlu slotlar ve binding'ler geçerli." />
        ) : (
          problems.map((p, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: problems are derived, no stable id
              key={i}
              type="button"
              onClick={() => selectBlock(p.blockId)}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <span className={p.level === 'error' ? 'text-red-400' : 'text-amber-400'}>
                {p.level === 'error' ? '✕' : '!'}
              </span>
              <span className="min-w-0 flex-1 text-[var(--color-text-secondary)]">{p.message}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
