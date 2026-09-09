/**
 * @fileoverview Zustand store for authentication state management.
 * Tracks the current user, authentication status, and loading state.
 */
import { create } from 'zustand';
import type { User } from '@/types';

/** Shape of the auth store state and actions */
interface AuthState {
  /** Currently authenticated user or null */
  user: User | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the initial auth check is in progress */
  isLoading: boolean;
  /** Sets the authenticated user and marks as authenticated */
  setUser: (user: User) => void;
  /** Clears the user and marks as unauthenticated */
  clearUser: () => void;
  /** Sets the loading state */
  setLoading: (loading: boolean) => void;
}

/** Auth state store (not persisted -- relies on HTTP-only cookies) */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),
}));
