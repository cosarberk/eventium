/**
 * @fileoverview Ephemeral UI state (not persisted): the IDE shell's panel
 * collapse state and the mobile navigation drawer. Shared across shell parts.
 */
import { create } from 'zustand';

/** UI store shape. */
interface UIState {
  /** Collapse the activity rail to icons-only (desktop). */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  /** Show the navigation as an open drawer on small screens. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
}

/** Global ephemeral UI store. */
export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
}));
