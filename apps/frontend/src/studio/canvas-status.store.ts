/**
 * @fileoverview Canvas status — ephemeral viewport context for the status bar.
 *
 * The free canvas publishes its live zoom, selection count and layout mode here
 * so the IDE status bar can show them, without threading state through the shell.
 * Not persisted; cleared when the canvas unmounts.
 */
import { create } from 'zustand';

interface CanvasStatusState {
  /** Whether a design canvas is currently mounted/active. */
  active: boolean;
  /** Current zoom factor (1 = 100%). */
  zoom: number;
  /** Number of selected blocks. */
  selected: number;
  /** Active layout mode label, if any. */
  layoutMode: string | null;
  /** Merge a partial status update. */
  set: (patch: Partial<Omit<CanvasStatusState, 'set'>>) => void;
}

/** Ephemeral canvas status store. */
export const useCanvasStatusStore = create<CanvasStatusState>((set) => ({
  active: false,
  zoom: 1,
  selected: 0,
  layoutMode: null,
  set: (patch) => set(patch),
}));
