/**
 * @fileoverview REST API service for admin user management.
 * All endpoints require an ADMIN session (enforced by the backend).
 */
import { apiRequest } from '@/api/http';
import type { User } from '@/types';

/** Assignable platform role. */
export type ManagedRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

/** A user record as returned by the management endpoints. */
export interface ManagedUser extends User {
  role: ManagedRole;
  mustChangePassword: boolean;
  createdAt: string;
}

/** Input for creating a user. */
export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: ManagedRole;
}

/** Input for updating a user's name and/or role. */
export interface UpdateUserInput {
  name?: string;
  role?: ManagedRole;
}

/** List every user. */
export async function listUsers(): Promise<ManagedUser[]> {
  const { users } = await apiRequest<{ users: ManagedUser[] }>(
    '/users',
    {},
    'Failed to load users',
  );
  return users;
}

/** Create a user (they must change their password on first login). */
export async function createUser(input: CreateUserInput): Promise<ManagedUser> {
  const { user } = await apiRequest<{ user: ManagedUser }>(
    '/users',
    { method: 'POST', body: JSON.stringify(input) },
    'Failed to create user',
  );
  return user;
}

/** Update a user's name and/or role. */
export async function updateUser(id: string, input: UpdateUserInput): Promise<ManagedUser> {
  const { user } = await apiRequest<{ user: ManagedUser }>(
    `/users/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    'Failed to update user',
  );
  return user;
}

/** Reset a user's password; forces a change on their next login. */
export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await apiRequest(
    `/users/${id}/reset-password`,
    { method: 'POST', body: JSON.stringify({ newPassword }) },
    'Failed to reset password',
  );
}

/** Delete a user. */
export async function deleteUser(id: string): Promise<void> {
  await apiRequest(`/users/${id}`, { method: 'DELETE' }, 'Failed to delete user');
}
