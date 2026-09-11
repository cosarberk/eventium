/**
 * @fileoverview Project metadata helpers.
 *
 * A "project" is persisted on top of the existing dashboard entity: its type and
 * layout mode live in the dashboard's `layout` blob (alongside `columns` and
 * `variables`), so no schema change is needed and the mapping stays additive.
 * The type is always resolved through the project-type registry — never a
 * hardcoded assumption.
 */
import { DEFAULT_PROJECT_TYPE, getProjectType, type LayoutMode } from './project-types';

/** Read a project's type id from its layout blob, falling back to the default. */
export function readProjectTypeId(layout: unknown): string {
  if (layout && typeof layout === 'object') {
    const t = (layout as { projectType?: unknown }).projectType;
    if (typeof t === 'string' && getProjectType(t)) return t;
  }
  return DEFAULT_PROJECT_TYPE;
}

/** Read a project's effective layout mode (from its type descriptor). */
export function readLayoutMode(layout: unknown): LayoutMode {
  return getProjectType(readProjectTypeId(layout))?.layoutMode ?? 'grid';
}

/**
 * Build the `layout` blob for a new project of the given type, so its type and
 * layout mode travel with the page from creation.
 */
export function projectLayout(typeId: string, columns = 12): Record<string, unknown> {
  const type = getProjectType(typeId);
  return {
    columns,
    projectType: type?.id ?? DEFAULT_PROJECT_TYPE,
    layoutMode: type?.layoutMode ?? 'grid',
  };
}
