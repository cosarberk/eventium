/**
 * @fileoverview Project-type barrel + registration.
 *
 * Importing this module registers every built-in project type as a side effect.
 * Import it once at app startup so the launcher and editor see all types. Adding
 * a type = add a descriptor under `builtin/`, then list it here.
 */

import { appType } from './builtin/app';
import { blankType } from './builtin/blank';
import { dashboardType } from './builtin/dashboard';
import { reportType } from './builtin/report';
import { siteType } from './builtin/site';
import { registerProjectType } from './registry';
import type { ProjectTypeDescriptor } from './types';

/** Every built-in project type, in launcher display order. */
export const BUILTIN_PROJECT_TYPES: readonly ProjectTypeDescriptor[] = [
  dashboardType,
  siteType,
  appType,
  reportType,
  blankType,
];

for (const type of BUILTIN_PROJECT_TYPES) {
  registerProjectType(type);
}

export {
  DEFAULT_PROJECT_TYPE,
  getProjectType,
  listProjectTypes,
  registerProjectType,
} from './registry';
export type {
  LayoutMode,
  PaletteGroup,
  PaneKind,
  ProjectStarter,
  ProjectTypeDescriptor,
  PublishTarget,
} from './types';
