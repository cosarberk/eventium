/**
 * @fileoverview Component render contract.
 *
 * The design layer resolves a block's bindings, then hands each component
 * renderer its {@link BlockData}: for every slot, the ordered list of bound
 * values paired with their resolved data. Renderers are pure — they read
 * `data`, apply formatting/color rules, and draw. They never fetch.
 */

import type { ReactNode } from 'react';
import type { BoundValue, ComponentDescriptor, DashboardBlock, ResolvedBinding } from '@/types';
import type { BlockInteractionEmit } from './interactions';

/** One filled slot entry: the design-time bound value + its resolved data. */
export interface ResolvedSlotValue {
  /** The design-time definition (label, color rules, format, binding). */
  boundValue: BoundValue;
  /** Resolved data, or `null` for a static value / unresolved binding. */
  resolved: ResolvedBinding | null;
}

/** A block's resolved data, keyed by slot: `slotKey -> ordered bound values`. */
export type BlockData = Record<string, ResolvedSlotValue[]>;

/** Props every component renderer receives. */
export interface ComponentRenderProps {
  /** The block being rendered. */
  block: DashboardBlock;
  /** Resolved data for each slot. */
  data: BlockData;
  /** True when rendering in the live/TV view (affects density/interactivity). */
  isLive?: boolean;
  /**
   * Fires the block's configured drill-down / cross-filter when present.
   * Renderers that expose clickable rows (e.g. tables) call it with the clicked
   * row; when absent the block has no interaction and rows stay inert.
   */
  onInteract?: BlockInteractionEmit;
}

/** A registry entry: a component's descriptor + its renderer. */
export interface ComponentRenderer {
  descriptor: ComponentDescriptor;
  render: (props: ComponentRenderProps) => ReactNode;
}
