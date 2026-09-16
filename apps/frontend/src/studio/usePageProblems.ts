/**
 * @fileoverview Shared page-validation hook.
 *
 * Computes the active page's problems — required slots left unbound, malformed
 * binding refs, unknown component types — so both the Problems panel and its
 * dock tab badge read from one source.
 */
import { parseFieldRef } from '@eventium/shared';
import { getComponent } from '@/components/design/registry';
import { useDashboardStore } from '@/storage/dashboard.store';

/** A single validation problem on the page. */
export interface Problem {
  blockId: string;
  level: 'error' | 'warn';
  message: string;
}

/** Validate the active page and return its problems plus severity counts. */
export function usePageProblems(): {
  problems: Problem[];
  errors: number;
  warns: number;
  total: number;
} {
  const activeDashboard = useDashboardStore((s) => s.activeDashboard);
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

  const errors = problems.filter((p) => p.level === 'error').length;
  const warns = problems.length - errors;
  return { problems, errors, warns, total: problems.length };
}
