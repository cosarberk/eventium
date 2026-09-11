/**
 * @fileoverview Zustand store for design-layer page state.
 *
 * A "dashboard" is a design-layer page: a grid of {@link DashboardBlock}s, each a
 * component instance whose slots carry cross-source bindings. This store holds
 * the active page and the in-progress edits made in the builder before they are
 * persisted. It is block-based — there is no plugin/panel/view-model concept.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getComponent } from '@/components/design/registry';
import type { BlockSlot, Dashboard, DashboardBlock, ID } from '@/types';

/** A single grid item (position + size) as reported by react-grid-layout. */
export interface GridItem {
  id: ID;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Derives a stable reading-order sort key from a grid cell (top→bottom, left→right). */
function sortOrderFor(y: number, x: number): number {
  return y * 100 + x;
}

/** Generates a reasonably-unique block id without external deps. */
function makeBlockId(): string {
  return `block-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Shape of the dashboard store state and actions. */
interface DashboardState {
  /** Currently active page. */
  activeDashboard: Dashboard | null;
  /** All available pages. */
  dashboards: Dashboard[];
  /** Whether the builder is in edit mode. */
  isEditMode: boolean;
  /** Currently selected block id (drives the Inspector dock). */
  selectedBlockId: ID | null;
  /** Undo/redo history of block snapshots (structural edits). */
  past: DashboardBlock[][];
  future: DashboardBlock[][];

  /** Selects a block for the inspector (null clears). */
  selectBlock: (id: ID | null) => void;
  /** Undo the last structural edit. */
  undo: () => void;
  /** Redo the last undone edit. */
  redo: () => void;
  /** Replaces the list of pages and reconciles the active selection. */
  setDashboards: (dashboards: Dashboard[]) => void;
  /** Sets the active page. */
  setActiveDashboard: (dashboard: Dashboard) => void;
  /**
   * Adds a new block of the given component type. Without `at` it lands on a
   * fresh row below everything; with `at` it lands at that grid cell (used when
   * a component is dragged from the palette and dropped on the canvas).
   */
  addBlock: (componentType: string, at?: { x: number; y: number }) => void;
  /** Adds a fully-formed block (pre-filled slots/options/title) and selects it. */
  addBlockWithSlots: (
    componentType: string,
    slots: Record<string, BlockSlot>,
    options?: Record<string, unknown>,
    title?: string,
  ) => void;
  /** Removes a block by id. */
  removeBlock: (id: ID) => void;
  /** Applies a full grid layout (position + size + sortOrder) to the active page. */
  updateBlockLayout: (items: ReadonlyArray<GridItem>) => void;
  /** Updates a block's user-facing title. */
  updateBlockTitle: (id: ID, title: string) => void;
  /** Replaces a block's slot bindings. */
  updateBlockSlots: (id: ID, slots: Record<string, BlockSlot>) => void;
  /** Replaces a block's static component options. */
  updateBlockOptions: (id: ID, options: Record<string, unknown>) => void;
  /** Sets a block's free-canvas frame (absolute px geometry) in its options. */
  updateBlockFrame: (id: ID, frame: { x: number; y: number; w: number; h: number }) => void;
  /** Adds a block at an absolute free-canvas position (palette drop) and selects it. */
  addBlockWithFrame: (componentType: string, at: { x: number; y: number }) => void;
  /**
   * Clones the given block snapshots as new blocks, offsetting any free-canvas
   * frame, selecting the last, and returning the new ids. Powers duplicate
   * (⌘D) and paste (⌘V) on the canvas.
   */
  addClones: (snapshots: readonly DashboardBlock[], offset: number) => ID[];
  /** Toggles edit mode. */
  toggleEditMode: () => void;
  /** Sets edit mode explicitly. */
  setEditMode: (editing: boolean) => void;
}

/** Dashboard/page store; persists only the active page id across reloads. */
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      activeDashboard: null,
      dashboards: [],
      isEditMode: false,
      selectedBlockId: null,
      past: [],
      future: [],

      selectBlock: (id) => set({ selectedBlockId: id }),

      undo: () => {
        const { past, future, activeDashboard } = get();
        const prev = past[past.length - 1];
        if (!prev || !activeDashboard) return;
        set({
          past: past.slice(0, -1),
          future: [activeDashboard.blocks, ...future].slice(0, 50),
          activeDashboard: { ...activeDashboard, blocks: prev },
          selectedBlockId: null,
        });
      },

      redo: () => {
        const { past, future, activeDashboard } = get();
        const next = future[0];
        if (!next || !activeDashboard) return;
        set({
          past: [...past, activeDashboard.blocks].slice(-50),
          future: future.slice(1),
          activeDashboard: { ...activeDashboard, blocks: next },
          selectedBlockId: null,
        });
      },

      setDashboards: (dashboards) => {
        const current = get().activeDashboard;
        const active = current
          ? (dashboards.find((d) => d.id === current.id) ??
            dashboards.find((d) => d.isDefault) ??
            dashboards[0])
          : (dashboards.find((d) => d.isDefault) ?? dashboards[0]);
        set({ dashboards, activeDashboard: active ?? null, past: [], future: [] });
      },

      setActiveDashboard: (dashboard) => {
        set({ activeDashboard: dashboard, selectedBlockId: null, past: [], future: [] });
      },

      addBlock: (componentType, at) => {
        const dashboard = get().activeDashboard;
        if (!dashboard) return;

        const descriptor = getComponent(componentType)?.descriptor;
        const w = descriptor?.defaultWidth ?? 6;
        const h = descriptor?.defaultHeight ?? 4;

        // Drop position when dragged from the palette; otherwise a fresh row
        // below everything else.
        const bottom = dashboard.blocks.reduce(
          (max, b) => Math.max(max, b.position.y + b.size.h),
          0,
        );
        const x = at ? Math.max(0, Math.min(at.x, 12 - Math.min(w, 12))) : 0;
        const y = at ? Math.max(0, at.y) : bottom;

        // Pre-seed a slot entry per descriptor slot so the inspector and renderers
        // always have a stable key set to work with.
        const slots: Record<string, BlockSlot> = {};
        for (const slot of descriptor?.slots ?? []) {
          slots[slot.key] = { values: [] };
        }

        const block: DashboardBlock = {
          id: makeBlockId(),
          componentType,
          title: descriptor?.label ?? componentType,
          slots,
          options: {},
          position: { x, y },
          size: { w, h },
          sortOrder: sortOrderFor(y, x),
        };

        set({
          activeDashboard: { ...dashboard, blocks: [...dashboard.blocks, block] },
          past: [...get().past, dashboard.blocks].slice(-50),
          future: [],
          selectedBlockId: block.id,
        });
      },

      addBlockWithSlots: (componentType, slots, options, title) => {
        const dashboard = get().activeDashboard;
        if (!dashboard) return;
        const descriptor = getComponent(componentType)?.descriptor;
        const w = descriptor?.defaultWidth ?? 6;
        const h = descriptor?.defaultHeight ?? 4;
        const bottom = dashboard.blocks.reduce(
          (max, b) => Math.max(max, b.position.y + b.size.h),
          0,
        );
        const block: DashboardBlock = {
          id: makeBlockId(),
          componentType,
          title: title ?? descriptor?.label ?? componentType,
          slots,
          options: options ?? {},
          position: { x: 0, y: bottom },
          size: { w, h },
          sortOrder: sortOrderFor(bottom, 0),
        };
        set({
          activeDashboard: { ...dashboard, blocks: [...dashboard.blocks, block] },
          past: [...get().past, dashboard.blocks].slice(-50),
          future: [],
          selectedBlockId: block.id,
        });
      },

      removeBlock: (id) => {
        const dashboard = get().activeDashboard;
        if (!dashboard) return;
        set({
          activeDashboard: {
            ...dashboard,
            blocks: dashboard.blocks.filter((b) => b.id !== id),
          },
          past: [...get().past, dashboard.blocks].slice(-50),
          future: [],
          ...(get().selectedBlockId === id ? { selectedBlockId: null } : {}),
        });
      },

      updateBlockLayout: (items) => {
        const dashboard = get().activeDashboard;
        if (!dashboard) return;
        const byId = new Map(items.map((i) => [i.id, i]));
        const blocks = dashboard.blocks.map((b) => {
          const item = byId.get(b.id);
          if (!item) return b;
          return {
            ...b,
            position: { x: item.x, y: item.y },
            size: { w: item.w, h: item.h },
            sortOrder: sortOrderFor(item.y, item.x),
          };
        });
        set({
          activeDashboard: { ...dashboard, blocks },
          past: [...get().past, dashboard.blocks].slice(-50),
          future: [],
        });
      },

      updateBlockTitle: (id, title) => {
        const dashboard = get().activeDashboard;
        if (!dashboard) return;
        const blocks = dashboard.blocks.map((b) => (b.id === id ? { ...b, title } : b));
        set({
          activeDashboard: { ...dashboard, blocks },
          past: [...get().past, dashboard.blocks].slice(-50),
          future: [],
        });
      },

      updateBlockSlots: (id, slots) => {
        const dashboard = get().activeDashboard;
        if (!dashboard) return;
        const blocks = dashboard.blocks.map((b) => (b.id === id ? { ...b, slots } : b));
        set({
          activeDashboard: { ...dashboard, blocks },
          past: [...get().past, dashboard.blocks].slice(-50),
          future: [],
        });
      },

      updateBlockOptions: (id, options) => {
        const dashboard = get().activeDashboard;
        if (!dashboard) return;
        const blocks = dashboard.blocks.map((b) => (b.id === id ? { ...b, options } : b));
        set({
          activeDashboard: { ...dashboard, blocks },
          past: [...get().past, dashboard.blocks].slice(-50),
          future: [],
        });
      },

      addBlockWithFrame: (componentType, at) => {
        const dashboard = get().activeDashboard;
        if (!dashboard) return;
        const descriptor = getComponent(componentType)?.descriptor;
        const w = (descriptor?.defaultWidth ?? 4) * 80;
        const h = (descriptor?.defaultHeight ?? 3) * 60;
        const slots: Record<string, BlockSlot> = {};
        for (const slot of descriptor?.slots ?? []) slots[slot.key] = { values: [] };
        const bottom = dashboard.blocks.reduce(
          (max, b) => Math.max(max, b.position.y + b.size.h),
          0,
        );
        const block: DashboardBlock = {
          id: makeBlockId(),
          componentType,
          title: descriptor?.label ?? componentType,
          slots,
          options: { frame: { x: at.x, y: at.y, w, h } },
          position: { x: 0, y: bottom },
          size: { w: descriptor?.defaultWidth ?? 4, h: descriptor?.defaultHeight ?? 3 },
          sortOrder: sortOrderFor(bottom, 0),
        };
        set({
          activeDashboard: { ...dashboard, blocks: [...dashboard.blocks, block] },
          past: [...get().past, dashboard.blocks].slice(-50),
          future: [],
          selectedBlockId: block.id,
        });
      },

      addClones: (snapshots, offset) => {
        const dashboard = get().activeDashboard;
        if (!dashboard || snapshots.length === 0) return [];
        const clones = snapshots.map((b) => {
          const fr = (b.options as { frame?: { x: number; y: number; w: number; h: number } })
            .frame;
          const options = fr
            ? { ...b.options, frame: { ...fr, x: fr.x + offset, y: fr.y + offset } }
            : { ...b.options };
          return {
            ...b,
            id: makeBlockId(),
            options,
            position: { x: b.position.x, y: b.position.y + 1 },
          } as DashboardBlock;
        });
        const lastId = clones[clones.length - 1]?.id ?? null;
        set({
          activeDashboard: { ...dashboard, blocks: [...dashboard.blocks, ...clones] },
          past: [...get().past, dashboard.blocks].slice(-50),
          future: [],
          selectedBlockId: lastId,
        });
        return clones.map((c) => c.id);
      },

      updateBlockFrame: (id, frame) => {
        const dashboard = get().activeDashboard;
        if (!dashboard) return;
        const blocks = dashboard.blocks.map((b) =>
          b.id === id ? { ...b, options: { ...b.options, frame } } : b,
        );
        set({
          activeDashboard: { ...dashboard, blocks },
          past: [...get().past, dashboard.blocks].slice(-50),
          future: [],
        });
      },

      toggleEditMode: () => {
        set({ isEditMode: !get().isEditMode });
      },

      setEditMode: (editing) => {
        set({ isEditMode: editing });
      },
    }),
    {
      name: 'eventium-dashboard',
      partialize: (state) => ({
        activeDashboard: state.activeDashboard ? { id: state.activeDashboard.id } : null,
      }),
    },
  ),
);
