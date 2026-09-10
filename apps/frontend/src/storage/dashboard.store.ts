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
  /** Adds a new block of the given component type at the bottom of the grid. */
  addBlock: (componentType: string) => void;
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

      addBlock: (componentType) => {
        const dashboard = get().activeDashboard;
        if (!dashboard) return;

        const descriptor = getComponent(componentType)?.descriptor;
        const w = descriptor?.defaultWidth ?? 6;
        const h = descriptor?.defaultHeight ?? 4;

        // Place the new block on a fresh row below everything else.
        const bottom = dashboard.blocks.reduce(
          (max, b) => Math.max(max, b.position.y + b.size.h),
          0,
        );

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
          position: { x: 0, y: bottom },
          size: { w, h },
          sortOrder: sortOrderFor(bottom, 0),
        };

        set({
          activeDashboard: { ...dashboard, blocks: [...dashboard.blocks, block] },
          past: [...get().past, dashboard.blocks].slice(-50),
          future: [],
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
