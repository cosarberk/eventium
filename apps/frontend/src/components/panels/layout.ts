/**
 * @fileoverview Grid helpers translating design-layer blocks into
 * react-grid-layout items. Shared by the builder and the live/TV views so block
 * positions stay identical across editing and broadcasting.
 */
import type { Layout } from 'react-grid-layout';
import type { DashboardBlock } from '@/types';

/** Number of columns in the page grid. */
export const GRID_COLS = 12;

/**
 * Builds a react-grid-layout array from page blocks, deriving sensible default
 * positions for blocks that have not been placed yet.
 * @param blocks - The page's blocks.
 * @returns Layout items keyed by block id.
 */
export function blocksToLayout(blocks: readonly DashboardBlock[]): Layout[] {
  return blocks.map((b, i) => ({
    i: b.id,
    x: Number.isFinite(b.position?.x) ? b.position.x : (i * 6) % GRID_COLS,
    y: Number.isFinite(b.position?.y) ? b.position.y : Math.floor(i / 2) * 4,
    w: b.size?.w && b.size.w > 0 ? b.size.w : 6,
    h: b.size?.h && b.size.h > 0 ? b.size.h : 4,
    minW: 2,
    minH: 2,
  }));
}

/**
 * Returns the number of grid rows a layout occupies (max bottom edge).
 * @param layout - Layout items.
 * @returns Row count, at least 1.
 */
export function layoutRowCount(layout: Layout[]): number {
  return Math.max(1, ...layout.map((l) => l.y + l.h));
}
