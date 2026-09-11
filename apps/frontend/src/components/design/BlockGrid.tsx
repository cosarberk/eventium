/**
 * @fileoverview BlockGrid — the shared page render surface.
 *
 * Lays out a page's blocks on a 12-column react-grid-layout and renders each via
 * {@link BlockRenderer}. Used by both the builder (draggable/resizable, editable
 * shells) and the live/TV views (read-only, row height scaled to fill the
 * screen). Importing this module also registers every design component.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import GridLayout, { type Layout, WidthProvider } from 'react-grid-layout';
import { BlockRenderer } from '@/components/design/BlockRenderer';
import { blocksToLayout, GRID_COLS, layoutRowCount } from '@/components/panels/layout';
import type { GridItem } from '@/storage/dashboard.store';
import type { LayoutMode } from '@/studio/project-types';
import type { DashboardBlock } from '@/types';
// Side-effect: registers all component renderers into the design registry.
import '@/components/design/components';

/** Width-aware grid that fills its container. */
const Grid = WidthProvider(GridLayout);

/** Fixed row height (px) used in the editable builder. */
const EDITOR_ROW_HEIGHT = 48;
/** Gap between grid cells (px). */
const MARGIN = 12;
/** Tighter gap for the TV/live view. */
const LIVE_MARGIN = 10;
/** Drag handle selector — matches PanelWrapper's handle class. */
const DRAG_HANDLE = '.eventium-drag-handle';

/** Props for {@link BlockGrid}. */
export interface BlockGridProps {
  /** The blocks to lay out. */
  blocks: readonly DashboardBlock[];
  /** True in the live/TV view: read-only, dark shell, height scaled to fill. */
  isLive?: boolean;
  /** True in the builder edit mode: draggable/resizable with edit controls. */
  editing?: boolean;
  /** Called with the new grid items after a drag/resize (builder only). */
  onLayoutChange?: (items: GridItem[]) => void;
  /** Remove a block by id (builder only). */
  onRemoveBlock?: (id: string) => void;
  /** Open a block's inspector by id (builder only). */
  onConfigureBlock?: (id: string) => void;
  /** Currently selected block id (builder only). */
  selectedId?: string | null;
  /** Select a block by id when clicked (builder only). */
  onSelectBlock?: (id: string) => void;
  /**
   * Canvas layout behaviour. `grid` packs vertically (dashboards); `free` lets
   * blocks stay exactly where dropped/moved and overlap (sites/tools); `flow`
   * behaves like grid for now. Drives compaction/overlap only — the stored
   * position model is identical, so the live/broadcast views are unaffected.
   */
  layoutMode?: LayoutMode;
  /**
   * Called when a component is dragged from the palette and dropped on the
   * canvas, with its type and the grid cell it landed on (builder only).
   */
  onExternalDrop?: (componentType: string, at: { x: number; y: number }) => void;
}

/** Placeholder shown while dragging a palette item over the canvas. */
const DROPPING_ITEM = { i: '__dropping__', w: 4, h: 4 };

/**
 * Renders the page grid. In live mode the row height is derived from the
 * container so the whole layout fills the available vertical space.
 * @param props - See {@link BlockGridProps}.
 */
export function BlockGrid({
  blocks,
  isLive = false,
  editing = false,
  onLayoutChange,
  onRemoveBlock,
  onConfigureBlock,
  selectedId,
  onSelectBlock,
  layoutMode = 'grid',
  onExternalDrop,
}: BlockGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  /** Track container height (live mode) so row height can scale to fill. */
  useLayoutEffect(() => {
    if (!isLive) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => setHeight(el.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLive]);

  const layout = useMemo(() => blocksToLayout(blocks), [blocks]);
  const margin = isLive ? LIVE_MARGIN : MARGIN;

  /** Live: scale rows to fill; builder: fixed height. */
  const rows = layoutRowCount(layout);
  const rowHeight = isLive
    ? height > 0
      ? Math.max(36, (height - (rows + 1) * margin) / rows)
      : 56
    : EDITOR_ROW_HEIGHT;

  const handleLayoutChange = (next: Layout[]) => {
    if (!editing) return;
    onLayoutChange?.(next.map((l) => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
  };

  const droppable = editing && Boolean(onExternalDrop);
  /** Read the dragged component type from the drop event and place it. */
  const handleDrop = (_layout: Layout[], item: Layout, e: Event) => {
    const type = (e as DragEvent).dataTransfer?.getData('text/plain');
    if (type && onExternalDrop) onExternalDrop(type, { x: item.x, y: item.y });
  };

  // `free` keeps blocks where placed (no auto-pack) and allows overlap — the
  // desktop-canvas feel; other modes pack vertically. Live view never edits.
  const free = layoutMode === 'free';

  return (
    <div ref={containerRef} className={isLive ? 'h-full w-full overflow-hidden' : undefined}>
      <Grid
        className={isLive ? 'h-full' : '-mx-1'}
        style={!isLive && editing ? { minHeight: 420 } : undefined}
        layout={layout}
        cols={GRID_COLS}
        rowHeight={rowHeight}
        margin={[margin, margin]}
        containerPadding={[isLive ? margin : 4, isLive ? margin : 4]}
        isDraggable={editing}
        isResizable={editing}
        // Free canvas: grab the whole card to move it (desktop feel); grid mode:
        // only the drag handle. Interactive elements never start a drag.
        draggableHandle={free ? undefined : DRAG_HANDLE}
        draggableCancel=".eventium-no-drag, button, input, textarea, select, a"
        compactType={free ? null : 'vertical'}
        allowOverlap={free}
        isDroppable={droppable}
        droppingItem={DROPPING_ITEM}
        onDrop={droppable ? handleDrop : undefined}
        onLayoutChange={handleLayoutChange}
      >
        {blocks.map((block) => (
          <div key={block.id}>
            <BlockRenderer
              block={block}
              isLive={isLive}
              editing={editing}
              freeDrag={free && editing}
              selected={editing && selectedId === block.id}
              onSelect={editing && onSelectBlock ? () => onSelectBlock(block.id) : undefined}
              onRemove={editing && onRemoveBlock ? () => onRemoveBlock(block.id) : undefined}
              onConfigure={
                editing && onConfigureBlock ? () => onConfigureBlock(block.id) : undefined
              }
            />
          </div>
        ))}
      </Grid>
    </div>
  );
}
