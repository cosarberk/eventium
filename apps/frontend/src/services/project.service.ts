/**
 * @fileoverview Service layer for project CRUD.
 *
 * A project is the top-level unit that owns pages (dashboards). Page/block
 * editing still flows through {@link ./dashboard.service}; this service manages
 * the project root and page membership.
 */
import { urqlClient } from '@/api/client';
import {
  CREATE_PAGE,
  CREATE_PROJECT,
  DELETE_PROJECT,
  EXPORT_PROJECT,
  GET_PROJECTS,
  IMPORT_PROJECT,
  UPDATE_PROJECT,
} from '@/api/graphql';
import type { Dashboard, Project } from '@/types';

/** Fetches all projects with their pages. */
export async function fetchProjects(): Promise<Project[]> {
  const result = await urqlClient.query(GET_PROJECTS, {}).toPromise();
  if (result.error) throw new Error(result.error.message);
  return (result.data?.projects ?? []) as Project[];
}

/** Creates a project (with one empty starter page). */
export async function createProject(input: {
  name: string;
  type?: string;
  description?: string;
}): Promise<Project> {
  const result = await urqlClient.mutation(CREATE_PROJECT, { input }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.createProject as Project;
}

/** Updates a project's name/type/description. */
export async function updateProject(
  id: string,
  input: { name?: string; type?: string; description?: string },
): Promise<Project> {
  const result = await urqlClient.mutation(UPDATE_PROJECT, { id, input }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.updateProject as Project;
}

/** Deletes a project and all of its pages. */
export async function deleteProject(id: string): Promise<{ id: string }> {
  const result = await urqlClient.mutation(DELETE_PROJECT, { id }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.deleteProject as { id: string };
}

/** Adds a new empty page to a project. */
export async function createPage(projectId: string, name: string): Promise<Dashboard> {
  const result = await urqlClient.mutation(CREATE_PAGE, { projectId, name }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.createPage as Dashboard;
}

/** Export a project to a portable spec object. */
export async function exportProject(id: string): Promise<unknown> {
  const result = await urqlClient.query(EXPORT_PROJECT, { id }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.exportProject;
}

/** Recreate a project from an exported spec. */
export async function importProject(spec: unknown): Promise<Project> {
  const result = await urqlClient.mutation(IMPORT_PROJECT, { spec }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.importProject as Project;
}
