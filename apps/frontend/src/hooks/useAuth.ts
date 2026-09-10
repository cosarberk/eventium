/**
 * @fileoverview React hook for authentication operations.
 * Combines the auth Zustand store with REST API calls for session management.
 * Components should use this hook instead of accessing stores or API directly.
 */
import { useCallback } from 'react';
import * as authApi from '@/api/auth';
import { useAuthStore } from '@/storage/auth.store';

/**
 * Hook providing complete authentication capabilities.
 * Manages login, register, logout, and session verification.
 * @returns Auth state and action functions
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  /**
   * Authenticates a user with email and password.
   * Updates the auth store on success.
   * @param email - User email
   * @param password - User password
   */
  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const loggedInUser = await authApi.login(email, password);
        setUser(loggedInUser);
      } catch (error) {
        clearUser();
        throw error;
      }
    },
    [setUser, clearUser, setLoading],
  );

  /**
   * Registers a new user and authenticates the session.
   * Updates the auth store on success.
   * @param email - User email
   * @param name - Display name
   * @param password - Chosen password
   */
  const register = useCallback(
    async (email: string, name: string, password: string) => {
      setLoading(true);
      try {
        const newUser = await authApi.register(email, name, password);
        setUser(newUser);
      } catch (error) {
        clearUser();
        throw error;
      }
    },
    [setUser, clearUser, setLoading],
  );

  /**
   * Changes the current user's password and clears the forced-change flag.
   * @param currentPassword - The user's existing password.
   * @param newPassword - The new password (min 12 chars).
   */
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await authApi.changePassword(currentPassword, newPassword);
      if (user) setUser({ ...user, mustChangePassword: false });
    },
    [user, setUser],
  );

  /**
   * Terminates the current session.
   * Clears the auth store regardless of API outcome.
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearUser();
    }
  }, [clearUser]);

  /**
   * Verifies the current session by calling /api/auth/me.
   * Should be called on application mount.
   */
  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await authApi.getMe();
      if (currentUser) {
        setUser(currentUser);
      } else {
        clearUser();
      }
    } catch {
      clearUser();
    }
  }, [setUser, clearUser, setLoading]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    changePassword,
    logout,
    checkAuth,
  };
}
