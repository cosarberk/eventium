/**
 * @fileoverview Ephemeral UI state for the desktop-style workspace shell:
 * dock open/collapse state, the resizable inspector width, and the mobile nav.
 */
import { create } from 'zustand';

interface UIState {
  /** Left tool rail expanded to labels (desktop). Default false = icon rail. */
  railExpanded: boolean;
  toggleRail: () => void;

  /** Right inspector dock visibility + width (px). */
  inspectorOpen: boolean;
  inspectorWidth: number;
  toggleInspector: () => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorWidth: (px: number) => void;

  /** Mobile nav drawer. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  railExpanded: false,
  toggleRail: () => set((s) => ({ railExpanded: !s.railExpanded })),

  inspectorOpen: true,
  inspectorWidth: 300,
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setInspectorWidth: (px) => set({ inspectorWidth: Math.max(240, Math.min(560, px)) }),

  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
}));
