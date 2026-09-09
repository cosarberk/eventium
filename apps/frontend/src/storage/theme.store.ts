/**
 * @fileoverview Zustand store for theme state management.
 * Handles dark/light mode toggling with localStorage persistence.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '@/types';

/** Shape of the theme store state and actions */
interface ThemeState {
  /** Current active theme mode */
  mode: ThemeMode;
  /** Toggles between light and dark mode */
  toggle: () => void;
  /** Sets a specific theme mode */
  setMode: (mode: ThemeMode) => void;
}

/**
 * Applies the theme class to the document root element.
 * @param mode - The theme mode to apply
 */
function applyThemeToDOM(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/** Theme store with localStorage persistence */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      toggle: () => {
        const next = get().mode === 'dark' ? 'light' : 'dark';
        applyThemeToDOM(next);
        set({ mode: next });
      },
      setMode: (mode) => {
        applyThemeToDOM(mode);
        set({ mode });
      },
    }),
    {
      name: 'eventium-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.mode);
        }
      },
    },
  ),
);
