/**
 * @fileoverview REST API service for authentication operations.
 * Uses HTTP-only cookie-based authentication; all requests go through the
 * shared {@link apiRequest} helper so errors carry the backend's message.
 */
import { apiRequest } from '@/api/http';
import type { User } from '@/types';

/**
 * Authenticates a user with email and password.
 * Sets an HTTP-only cookie on success.
 */
export async function login(email: string, password: string): Promise<User> {
  const { user } = await apiRequest<{ user: User }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    'Login failed',
  );
  return user;
}

/**
 * Registers a new user account.
 * Sets an HTTP-only cookie on success.
 */
export async function register(email: string, name: string, password: string): Promise<User> {
  const { user } = await apiRequest<{ user: User }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify({ email, name, password }) },
    'Registration failed',
  );
  return user;
}

/**
 * Changes the current user's own password. Clears the forced-change flag.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest(
    '/auth/change-password',
    { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) },
    'Failed to change password',
  );
}

/**
 * Terminates the current session and clears the auth cookie.
 */
export async function logout(): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST' }, 'Logout failed');
}

/**
 * Validates the current session cookie and retrieves the user profile.
 * @returns The authenticated user, or null if the session is invalid.
 */
export async function getMe(): Promise<User | null> {
  try {
    const { user } = await apiRequest<{ user: User }>('/auth/me');
    return user;
  } catch {
    return null;
  }
}
