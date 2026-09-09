/**
 * @fileoverview Service layer for broadcast link CRUD operations.
 * Manages broadcast links for sharing dashboards publicly via urql.
 */
import { urqlClient } from '@/api/client';
import {
  CREATE_BROADCAST_LINK,
  DELETE_BROADCAST_LINK,
  GET_BROADCAST_LINKS,
  REGENERATE_BROADCAST_LINK_TOKEN,
  UPDATE_BROADCAST_LINK,
} from '@/api/graphql';
import type { BroadcastLink, ID } from '@/types';

/**
 * Fetches all broadcast links for the current user.
 * @returns Array of broadcast link configurations
 */
export async function fetchBroadcastLinks(): Promise<BroadcastLink[]> {
  const result = await urqlClient.query(GET_BROADCAST_LINKS, {}).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.broadcastLinks as BroadcastLink[];
}

/**
 * Creates a new broadcast link.
 * @param input - Broadcast link creation parameters
 * @returns The newly created broadcast link
 */
export async function createBroadcastLink(input: {
  name: string;
  dashboardIds: ID[];
  rotationInterval?: number;
}): Promise<BroadcastLink> {
  const result = await urqlClient.mutation(CREATE_BROADCAST_LINK, { input }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.createBroadcastLink as BroadcastLink;
}

/**
 * Updates an existing broadcast link.
 * @param id - The broadcast link ID
 * @param input - Partial fields to update
 * @returns The updated broadcast link
 */
export async function updateBroadcastLink(
  id: ID,
  input: {
    name?: string;
    enabled?: boolean;
    dashboardIds?: ID[];
    rotationInterval?: number;
  },
): Promise<BroadcastLink> {
  const result = await urqlClient.mutation(UPDATE_BROADCAST_LINK, { id, input }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.updateBroadcastLink as BroadcastLink;
}

/**
 * Deletes a broadcast link by its ID.
 * @param id - The broadcast link ID to delete
 * @returns The ID of the deleted broadcast link
 */
export async function deleteBroadcastLink(id: ID): Promise<{ id: string }> {
  const result = await urqlClient.mutation(DELETE_BROADCAST_LINK, { id }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.deleteBroadcastLink as { id: string };
}

/**
 * Regenerates the token for a broadcast link (invalidates old URL).
 * @param id - The broadcast link ID
 * @returns The updated broadcast link with new token
 */
export async function regenerateBroadcastLinkToken(id: ID): Promise<{ id: string; token: string }> {
  const result = await urqlClient.mutation(REGENERATE_BROADCAST_LINK_TOKEN, { id }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.regenerateBroadcastLinkToken as {
    id: string;
    token: string;
  };
}
