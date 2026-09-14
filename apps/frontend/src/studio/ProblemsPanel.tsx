/**
 * @fileoverview Problems tool window.
 * Validates the active page's controls — required slots left unbound, malformed
 * binding refs — and lets the user jump to the offending control.
 */
import { parseFieldRef } from '@eventium/shared';
import { getComponent } from '@/components/design/registry';
import { useDashboardStore } from '@/storage/dashboard.store';

interface Problem {
  blockId: string;
  level: 'error' | 'warn';
  message: string;
}

/** The problems panel. */
export function ProblemsPanel() {
  const activeDashboard = useDashboardStore((s) => s.activeDashboard);
  const selectBlock = useDashboardStore((s) => s.selectBlock);
  const blocks = activeDashboard?.blocks ?? [];

  const problems: Problem[] = [];
  for (const block of blocks) {
    const label = block.title || block.componentType;
    const descriptor = getComponent(block.componentType)?.descriptor;
    if (!descriptor) {
      problems.push({
        blockId: block.id,
        level: 'error',
        message: `${label}: bilinmeyen bileşen tipi`,
      });
      continue;
    }
    for (const slot of descriptor.slots) {
      const values = block.slots[slot.key]?.values ?? [];
      if (slot.required && values.length === 0) {
        problems.push({
          blockId: block.id,
          level: 'warn',
          message: `${label}: "${slot.label}" zorunlu ama bağlı değer yok`,
        });
      }
      for (const v of values) {
        if (v.binding && !parseFieldRef(v.binding.ref)) {
          problems.push({
            blockId: block.id,
            level: 'error',
            message: `${label}: geçersiz binding "${v.binding.ref}"`,
          });
        }
      }
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <div className="border-b border-[var(--color-border-primary)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
        Sorunlar · {problems.length}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-1.5 text-xs">
        {problems.length === 0 ? (
          <p className="px-2 py-3 text-[11px] text-[var(--color-text-tertiary)]">Sorun yok. ✓</p>
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
