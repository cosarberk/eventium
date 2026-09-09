/**
 * @fileoverview REST API service for public broadcast data.
 * Fetches broadcast link data by token without requiring authentication.
 */
import { config } from '@/config';
import type { BroadcastLink } from '@/types';

/**
 * Fetches public broadcast data by its unique token.
 * This endpoint does not require authentication.
 * @param token - The broadcast link token
 * @returns Broadcast link data including dashboards
 */
export async function fetchBroadcastByToken(token: string): Promise<BroadcastLink> {
  const response = await fetch(`${config.apiBaseUrl}/broadcast/${token}`);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? 'Broadcast not found');
  }

  return (await response.json()) as BroadcastLink;
}
