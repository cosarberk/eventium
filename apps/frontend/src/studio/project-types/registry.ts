/**
 * @fileoverview Project-type registry.
 *
 * Mirrors the component registry: the studio presents whatever project types are
 * registered here. Adding a type = writing a {@link ProjectTypeDescriptor} and
 * calling {@link registerProjectType}. The launcher and the editor read from this
 * registry — there is no hardcoded project-type switch.
 */
import type { ProjectTypeDescriptor } from './types';

/** All registered project types, keyed by id. Insertion order is preserved. */
const registry = new Map<string, ProjectTypeDescriptor>();

/** Register a project type. Later registrations override earlier ones by id. */
export function registerProjectType(descriptor: ProjectTypeDescriptor): void {
  registry.set(descriptor.id, descriptor);
}

/** Look up a project type by id. */
export function getProjectType(id: string): ProjectTypeDescriptor | undefined {
  return registry.get(id);
}

/** Every registered project type, in registration order (for the launcher). */
export function listProjectTypes(): ProjectTypeDescriptor[] {
  return Array.from(registry.values());
}

/**
 * The fallback project type id used when a project has no recorded type (legacy
 * dashboards) or references an unknown one. Kept as a constant, not hardcoded
 * behaviour: the studio still resolves it through the registry.
 */
export const DEFAULT_PROJECT_TYPE = 'dashboard';
