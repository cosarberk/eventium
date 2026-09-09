/**
 * @fileoverview Barrel export for legacy panel primitives.
 *
 * The plugin-panel/view-model system has been removed in favor of the design
 * layer (see `@/components/design`). What remains here are generic building
 * blocks: the grid `layout` helpers, the `PanelWrapper` shell (reused as a
 * block's edit shell), and two standalone list components.
 */
export { EventFeed } from './EventFeed';
export { blocksToLayout, GRID_COLS, layoutRowCount } from './layout';
export { PanelWrapper } from './PanelWrapper';
export { ProjectList } from './ProjectList';
