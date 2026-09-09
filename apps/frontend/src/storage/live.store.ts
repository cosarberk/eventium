/**
 * @fileoverview Zustand store for live preview mode state management.
 * Persists rotation preferences and active dashboard selection across sessions.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ID } from '@/types';

/** Shape of the live mode store state and actions */
interface LiveState {
  /** ID of the currently displayed dashboard */
  activeDashboardId: ID | null;
  /** Whether auto-rotation between dashboards is enabled */
  rotationEnabled: boolean;
  /** Interval in seconds between dashboard rotations */
  rotationInterval: number;
  /** Whether the cursor is currently visible */
  cursorVisible: boolean;

  /** Sets the active dashboard by ID */
  setActiveDashboardId: (id: ID) => void;
  /** Toggles auto-rotation on/off */
  toggleRotation: () => void;
  /** Sets the rotation interval in seconds */
  setRotationInterval: (seconds: number) => void;
  /** Sets cursor visibility */
  setCursorVisible: (visible: boolean) => void;
}

/** Live mode state store with localStorage persistence */
export const useLiveStore = create<LiveState>()(
  persist(
    (set, get) => ({
      activeDashboardId: null,
      rotationEnabled: true,
      rotationInterval: 30,
      cursorVisible: true,

      setActiveDashboardId: (id) => set({ activeDashboardId: id }),

      toggleRotation: () => set({ rotationEnabled: !get().rotationEnabled }),

      setRotationInterval: (seconds) => set({ rotationInterval: seconds }),

      setCursorVisible: (visible) => set({ cursorVisible: visible }),
    }),
    {
      name: 'eventium-live',
      partialize: (state) => ({
        rotationEnabled: state.rotationEnabled,
        rotationInterval: state.rotationInterval,
      }),
    },
  ),
);
