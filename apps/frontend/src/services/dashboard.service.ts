/**
 * @fileoverview Service layer for design-layer page (dashboard) CRUD.
 *
 * A page is persisted as the platform's "dashboard" entity for broadcast/live
 * compatibility. Its content is an array of {@link DashboardBlock}s — component
 * instances whose slots carry cross-source bindings. This service maps between
 * the client `DashboardBlock` shape and the GraphQL `BlockInput`.
 */
import { urqlClient } from '@/api/client';
import {
  CREATE_DASHBOARD,
  DELETE_DASHBOARD,
  GET_DASHBOARD,
  GET_DASHBOARDS,
  UPDATE_DASHBOARD,
} from '@/api/graphql';
import type { Dashboard, DashboardBlock } from '@/types';

/** Serializes a client block into the GraphQL `BlockInput` accepted by the API. */
function toBlockInput(block: DashboardBlock, index: number): Record<string, unknown> {
  return {
    componentType: block.componentType,
    title: block.title,
    slots: block.slots,
    options: block.options,
    position: block.position,
    size: block.size,
    sortOrder: block.sortOrder ?? index,
  };
}

/**
 * Fetches all pages for the current user.
 * @returns Array of pages with their blocks.
 */
export async function fetchDashboards(): Promise<Dashboard[]> {
  const result = await urqlClient.query(GET_DASHBOARDS, {}).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.dashboards as Dashboard[];
}

/**
 * Fetches a single page by id.
 * @param id - The page id.
 * @returns The page with its blocks.
 */
export async function fetchDashboard(id: string): Promise<Dashboard> {
  const result = await urqlClient.query(GET_DASHBOARD, { id }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.dashboard as Dashboard;
}

/**
 * Creates a new page with an optional initial set of blocks.
 * @param name - Display name for the page.
 * @param blocks - Initial blocks.
 * @param isDefault - Whether this becomes the default page.
 * @returns The newly created page.
 */
export async function createDashboard(
  name: string,
  blocks: DashboardBlock[] = [],
  isDefault = false,
): Promise<Dashboard> {
  const gqlBlocks = blocks.map(toBlockInput);
  const result = await urqlClient
    .mutation(CREATE_DASHBOARD, {
      input: { name, blocks: gqlBlocks.length > 0 ? gqlBlocks : undefined, isDefault },
    })
    .toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.createDashboard as Dashboard;
}

/**
 * Updates a page's name, blocks, or default status.
 * @param id - The page id to update.
 * @param input - Partial fields to update.
 * @returns The updated page.
 */
export async function updateDashboard(
  id: string,
  input: {
    name?: string;
    blocks?: DashboardBlock[];
    isDefault?: boolean;
  },
): Promise<Dashboard> {
  const gqlInput: Record<string, unknown> = {};
  if (input.name !== undefined) gqlInput.name = input.name;
  if (input.isDefault !== undefined) gqlInput.isDefault = input.isDefault;
  if (input.blocks) gqlInput.blocks = input.blocks.map(toBlockInput);

  const result = await urqlClient.mutation(UPDATE_DASHBOARD, { id, input: gqlInput }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.updateDashboard as Dashboard;
}

/**
 * Deletes a page by id.
 * @param id - The page id to delete.
 * @returns The id of the deleted page.
 */
export async function deleteDashboard(id: string): Promise<{ id: string }> {
  const result = await urqlClient.mutation(DELETE_DASHBOARD, { id }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.deleteDashboard as { id: string };
}
