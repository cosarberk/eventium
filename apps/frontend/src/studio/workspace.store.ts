/**
 * @fileoverview Document workspace — Visual Studio-style document well.
 *
 * Models open documents ("buffers") and tab groups ("panes"), like Visual
 * Studio's Windows Forms editor: the **Tasarımcı** (designer/canvas), a control's
 * **Kod** (code-behind) view, and its **Blueprint** (logic graph) are each their
 * own buffer. Buffers open as tabs in a tab group; a buffer can be split into a
 * new tab group (side by side) — never nested inside another view.
 *
 * Session-scoped (not persisted); the designer buffer always exists.
 */
import { create } from 'zustand';

/** A document view kind. */
export type BufferKind = 'designer' | 'code' | 'blueprint';

/** An open document. */
export interface Buffer {
  id: string;
  kind: BufferKind;
  /** The block a code/blueprint buffer belongs to. */
  blockId?: string;
  title: string;
}

/** A tab group (a column of the document well). */
export interface Pane {
  id: string;
  bufferIds: string[];
  activeId: string | null;
}

/** Canonical id for a buffer of a given kind/block. */
export function bufferId(kind: BufferKind, blockId?: string): string {
  return kind === 'designer' ? 'designer' : `${kind}:${blockId}`;
}

const DESIGNER: Buffer = { id: 'designer', kind: 'designer', title: 'Tasarımcı' };

let seq = 0;
const paneId = () => `pane-${Date.now()}-${seq++}`;

interface WorkspaceState {
  buffers: Record<string, Buffer>;
  panes: Pane[];
  activePaneId: string;
  /** Open (or focus) a buffer; `split` opens it in a new tab group. */
  openBuffer: (buffer: Buffer, opts?: { split?: boolean }) => void;
  /** Close a buffer within a tab group (the designer never closes). */
  closeBuffer: (paneId: string, bufferId: string) => void;
  /** Make a buffer the active tab of its group and focus that group. */
  setActive: (paneId: string, bufferId: string) => void;
  /** Focus a tab group. */
  focusPane: (paneId: string) => void;
  /** Open an already-open buffer in a fresh tab group (split). */
  splitBuffer: (bufferId: string) => void;
  /** Drop buffers whose block no longer exists; keep the designer. */
  pruneBlocks: (existingBlockIds: string[]) => void;
  /** Reset to a single group showing the designer. */
  reset: () => void;
}

function freshPane(): Pane {
  return { id: paneId(), bufferIds: ['designer'], activeId: 'designer' };
}

/** The document workspace store. */
export const useWorkspaceStore = create<WorkspaceState>((set) => {
  const first = freshPane();
  return {
    buffers: { designer: DESIGNER },
    panes: [first],
    activePaneId: first.id,

    openBuffer: (buffer, opts) =>
      set((state) => {
        const buffers = { ...state.buffers, [buffer.id]: buffer };
        if (opts?.split) {
          const p: Pane = { id: paneId(), bufferIds: [buffer.id], activeId: buffer.id };
          return { buffers, panes: [...state.panes, p], activePaneId: p.id };
        }
        const panes = state.panes.map((p) =>
          p.id === state.activePaneId
            ? {
                ...p,
                bufferIds: p.bufferIds.includes(buffer.id)
                  ? p.bufferIds
                  : [...p.bufferIds, buffer.id],
                activeId: buffer.id,
              }
            : p,
        );
        return { buffers, panes };
      }),

    closeBuffer: (pid, bid) =>
      set((state) => {
        if (bid === 'designer') return state; // designer stays open
        let panes = state.panes.map((p) => {
          if (p.id !== pid) return p;
          const bufferIds = p.bufferIds.filter((id) => id !== bid);
          const activeId =
            p.activeId === bid ? (bufferIds[bufferIds.length - 1] ?? null) : p.activeId;
          return { ...p, bufferIds, activeId };
        });
        panes = panes.filter((p) => p.bufferIds.length > 0);
        if (panes.length === 0) panes = [freshPane()];
        const activePaneId = panes.some((p) => p.id === state.activePaneId)
          ? state.activePaneId
          : (panes[0]?.id ?? '');
        return { panes, activePaneId };
      }),

    setActive: (pid, bid) =>
      set((state) => ({
        activePaneId: pid,
        panes: state.panes.map((p) => (p.id === pid ? { ...p, activeId: bid } : p)),
      })),

    focusPane: (pid) => set({ activePaneId: pid }),

    splitBuffer: (bid) =>
      set((state) => {
        const p: Pane = { id: paneId(), bufferIds: [bid], activeId: bid };
        return { panes: [...state.panes, p], activePaneId: p.id };
      }),

    pruneBlocks: (existing) =>
      set((state) => {
        const keep = (id: string) => {
          const b = state.buffers[id];
          return !b || b.kind === 'designer' || (b.blockId ? existing.includes(b.blockId) : true);
        };
        let panes = state.panes.map((p) => {
          const bufferIds = p.bufferIds.filter(keep);
          const activeId =
            p.activeId && bufferIds.includes(p.activeId)
              ? p.activeId
              : (bufferIds[bufferIds.length - 1] ?? null);
          return { ...p, bufferIds, activeId };
        });
        panes = panes.filter((p) => p.bufferIds.length > 0);
        if (panes.length === 0) panes = [freshPane()];
        const activePaneId = panes.some((p) => p.id === state.activePaneId)
          ? state.activePaneId
          : (panes[0]?.id ?? '');
        return { panes, activePaneId };
      }),

    reset: () => {
      const p = freshPane();
      set({ buffers: { designer: DESIGNER }, panes: [p], activePaneId: p.id });
    },
  };
});
