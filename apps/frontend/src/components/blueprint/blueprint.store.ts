/**
 * @fileoverview Blueprint persistence store.
 *
 * Holds the saved blueprint graph (nodes + edges) so a dataflow the user builds
 * survives reloads and re-opening the editor. Persisted to localStorage; the
 * React Flow editor hydrates from here on open and writes back on "Kaydet".
 */
import type { Edge, Node } from '@xyflow/react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** A serializable node (React Flow's node minus transient render fields). */
export interface SavedNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

/** A serializable edge. */
export interface SavedEdge {
  id: string;
  source: string;
  target: string;
}

interface BlueprintState {
  /** Saved nodes, or null when the user has never saved (use defaults). */
  nodes: SavedNode[] | null;
  edges: SavedEdge[] | null;
  /** Persist the current graph. */
  save: (nodes: Node[], edges: Edge[]) => void;
  /** Forget the saved graph (revert to the starter blueprint on next open). */
  clear: () => void;
}

/** Strip a React Flow node down to its persistable fields. */
function toSavedNode(n: Node): SavedNode {
  return { id: n.id, type: n.type, position: n.position, data: n.data };
}

/** Blueprint graph store (persisted). */
export const useBlueprintStore = create<BlueprintState>()(
  persist(
    (set) => ({
      nodes: null,
      edges: null,
      save: (nodes, edges) =>
        set({
          nodes: nodes.map(toSavedNode),
          edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
        }),
      clear: () => set({ nodes: null, edges: null }),
    }),
    { name: 'eventium-blueprint' },
  ),
);
