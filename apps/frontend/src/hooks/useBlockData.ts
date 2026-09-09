/**
 * @fileoverview useBlockData — resolves every binding on a page block.
 *
 * Collects the bindings across all of a block's slots into a single request,
 * resolves them, and reassembles the results into {@link BlockData} keyed by
 * slot. Live-refreshes on an interval and on socket events, mirroring the old
 * panel-data hook's freshness behaviour.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { BlockData, ResolvedSlotValue } from '@/components/design/render-types';
import { useEventSubscription } from '@/hooks/useSocket';
import { resolveBindings } from '@/services/binding.service';
import type { Binding, DashboardBlock, ResolvedBinding } from '@/types';

/** Flattened binding plus where it belongs, so results can be reassembled. */
interface CollectedBinding {
  slotKey: string;
  valueId: string;
  binding: Binding;
}

/** Walk a block's slots and pull out every live binding. */
function collectBindings(block: DashboardBlock): CollectedBinding[] {
  const collected: CollectedBinding[] = [];
  for (const [slotKey, slot] of Object.entries(block.slots)) {
    for (const value of slot.values) {
      if (value.binding) {
        collected.push({ slotKey, valueId: value.id, binding: value.binding });
      }
    }
  }
  return collected;
}

/** Reassemble resolved bindings into per-slot {@link BlockData}. */
function assemble(
  block: DashboardBlock,
  collected: CollectedBinding[],
  resolved: ResolvedBinding[] | undefined,
): BlockData {
  const byValueId = new Map<string, ResolvedBinding>();
  collected.forEach((c, i) => {
    const r = resolved?.[i];
    if (r) byValueId.set(c.valueId, r);
  });

  const data: BlockData = {};
  for (const [slotKey, slot] of Object.entries(block.slots)) {
    data[slotKey] = slot.values.map(
      (boundValue): ResolvedSlotValue => ({
        boundValue,
        resolved: byValueId.get(boundValue.id) ?? null,
      }),
    );
  }
  return data;
}

/** Resolve all bindings for one block, with live refresh. */
export function useBlockData(block: DashboardBlock): {
  data: BlockData;
  isLoading: boolean;
  error: Error | null;
} {
  const collected = useMemo(() => collectBindings(block), [block]);
  const bindings = useMemo(() => collected.map((c) => c.binding), [collected]);

  const query = useQuery({
    queryKey: ['blockData', block.id, bindings],
    queryFn: () => resolveBindings(bindings),
    enabled: bindings.length > 0,
    refetchInterval: 30_000,
    staleTime: 5_000,
  });

  // Refresh on any incoming event (a new event may change queried data).
  useEventSubscription(() => {
    if (bindings.length > 0) query.refetch();
  });

  const data = useMemo(
    () => assemble(block, collected, query.data),
    [block, collected, query.data],
  );

  return { data, isLoading: query.isLoading, error: query.error as Error | null };
}
