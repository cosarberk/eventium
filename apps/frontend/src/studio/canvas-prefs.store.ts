/**
 * @fileoverview Persisted canvas view preferences.
 *
 * Small, per-browser toggles for how the design surface looks — currently the
 * squared grid overlay. Shared by the canvas, its options bar and the Görünüm
 * menu so all three stay in sync.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CanvasPrefsState {
  /** Show the squared (graph-paper) grid instead of the subtle dot texture. */
  gridVisible: boolean;
  toggleGrid: () => void;
  setGrid: (visible: boolean) => void;
}

/** Canvas view preferences (persisted). */
export const useCanvasPrefsStore = create<CanvasPrefsState>()(
  persist(
    (set) => ({
      gridVisible: false,
      toggleGrid: () => set((s) => ({ gridVisible: !s.gridVisible })),
      setGrid: (visible) => set({ gridVisible: visible }),
    }),
    { name: 'eventium-canvas-prefs' },
  ),
);
