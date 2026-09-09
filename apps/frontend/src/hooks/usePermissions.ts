/**
 * @fileoverview Role-based capability checks for the UI.
 *
 * Mirrors the backend's role hierarchy (VIEWER < EDITOR < ADMIN). The server is
 * the authority — every mutation re-checks the role — but the UI should not
 * offer actions that will come back 403, so navigation and action buttons ask
 * these flags first.
 */
import { useAuthStore } from '@/storage/auth.store';

/** Platform roles, ordered from least to most privileged. */
export const ROLE_ORDER = ['VIEWER', 'EDITOR', 'ADMIN'] as const;

/** A platform role. */
export type Role = (typeof ROLE_ORDER)[number];

/**
 * Whether a role meets or exceeds the required level.
 *
 * @param role     - The role being checked (may be undefined when signed out).
 * @param required - Minimum role needed.
 */
export function hasRole(role: string | undefined, required: Role): boolean {
  if (!role) return false;
  const actual = ROLE_ORDER.indexOf(role as Role);
  return actual !== -1 && actual >= ROLE_ORDER.indexOf(required);
}

/** Capability flags derived from the signed-in user's role. */
export interface Permissions {
  /** The raw role string, or undefined when signed out. */
  role: string | undefined;
  /** May create and modify pages, rules, and broadcast links. */
  canEdit: boolean;
  /** May install, configure, and remove data sources (handles credentials). */
  canManageSources: boolean;
}

/**
 * Hook exposing what the current user is allowed to do.
 *
 * @returns Capability flags for the signed-in user.
 */
export function usePermissions(): Permissions {
  const role = useAuthStore((s) => s.user?.role);

  return {
    role,
    canEdit: hasRole(role, 'EDITOR'),
    canManageSources: hasRole(role, 'ADMIN'),
  };
}
