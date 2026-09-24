/**
 * @fileoverview useInteraction — turns a block's interaction config into a live
 * emit callback. Reads `block.options.interaction`; on emit it either writes a
 * runtime variable (cross-filter) or activates a target board (drill-down),
 * seeding a variable from the clicked row first when configured.
 *
 * Interactions are inert while the builder is in edit mode (a click there
 * selects the panel), so the caller passes `interactive: false` when editing.
 */
import { useCallback, useMemo } from 'react';
import {
  type BlockInteraction,
  type BlockInteractionEmit,
  type InteractionRow,
  interactionValue,
  readInteraction,
} from '@/components/design/interactions';
import { useDashboardStore } from '@/storage/dashboard.store';
import { useVariablesStore } from '@/storage/variables.store';
import type { DashboardBlock } from '@/types';

/** Result of {@link useInteraction}: the parsed config plus its emit callback. */
export interface UseInteractionResult {
  /** The active interaction config, or `null` when none/editing. */
  config: BlockInteraction | null;
  /** Fires the interaction for an optional clicked row. */
  emit: BlockInteractionEmit;
}

/**
 * Wires a block's interaction config to the variable and dashboard stores.
 * @param block - The block whose `options.interaction` drives the behaviour.
 * @param interactive - False while editing (interactions are then disabled).
 */
export function useInteraction(block: DashboardBlock, interactive: boolean): UseInteractionResult {
  const setVariable = useVariablesStore((s) => s.setVariable);
  const dashboards = useDashboardStore((s) => s.dashboards);
  const setActiveDashboard = useDashboardStore((s) => s.setActiveDashboard);

  const config = useMemo(
    () => (interactive ? readInteraction(block.options) : null),
    [interactive, block.options],
  );

  const emit = useCallback<BlockInteractionEmit>(
    (row?: InteractionRow) => {
      if (!config) return;
      // Seed a variable when one is configured (both actions may write one).
      if (config.variable) {
        setVariable(config.variable, interactionValue(config, row));
      }
      if (config.action === 'navigate' && config.boardId) {
        const target = dashboards.find((d) => d.id === config.boardId);
        if (target) setActiveDashboard(target);
      }
    },
    [config, setVariable, dashboards, setActiveDashboard],
  );

  return { config, emit };
}
