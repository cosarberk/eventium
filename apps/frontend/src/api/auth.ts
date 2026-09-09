/**
 * @fileoverview REST API service for authentication operations.
 * Uses HTTP-only cookie-based authentication with fetch credentials.
 */
import { config } from '@/config';

import type { User } from '@/types';

/** Base URL for all auth endpoints */
const AUTH_BASE = `${config.apiBaseUrl}/auth`;

/** Standard headers for JSON requests */
const JSON_HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
};

/** Common fetch options for auth requests (includes cookies) */
const FETCH_OPTIONS: RequestInit = {
  credentials: 'include',
  headers: JSON_HEADERS,
};

/**
 * Authenticates a user with email and password.
 * Sets an HTTP-only cookie on success.
 * @param email - User email address
 * @param password - User password
 * @returns Authenticated user profile
 */
export async function login(email: string, password: string): Promise<User> {
  const response = await fetch(`${AUTH_BASE}/login`, {
    ...FETCH_OPTIONS,
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? 'Login failed');
  }

  const data = (await response.json()) as { user: User };
  return data.user;
}

/**
 * Registers a new user account.
 * Sets an HTTP-only cookie on success.
 * @param email - User email address
 * @param name - Display name
 * @param password - Chosen password
 * @returns Newly created user profile
 */
export async function register(email: string, name: string, password: string): Promise<User> {
  const response = await fetch(`${AUTH_BASE}/register`, {
    ...FETCH_OPTIONS,
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? 'Registration failed');
  }

  const data = (await response.json()) as { user: User };
  return data.user;
}

/**
 * Terminates the current session and clears the auth cookie.
 */
export async function logout(): Promise<void> {
  const response = await fetch(`${AUTH_BASE}/logout`, {
    ...FETCH_OPTIONS,
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

/**
 * Validates the current session cookie and retrieves the user profile.
 * @returns The authenticated user, or null if the session is invalid
 */
export async function getMe(): Promise<User | null> {
  try {
    const response = await fetch(`${AUTH_BASE}/me`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { user: User };
    return data.user;
  } catch {
    return null;
  }
}
