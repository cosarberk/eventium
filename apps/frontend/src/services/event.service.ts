/**
 * @fileoverview Service layer for event-related API operations.
 * Provides functions to query monitoring events via urql.
 */
import { urqlClient } from '@/api/client';
import { GET_EVENTS } from '@/api/graphql';
import type { EventFilter, PaginatedEvents } from '@/types';

/**
 * Fetches a paginated list of events matching the provided filters.
 * @param filter - Optional filter criteria for the event query
 * @returns Paginated response containing event items
 */
export async function fetchEvents(filter?: EventFilter): Promise<PaginatedEvents> {
  const result = await urqlClient.query(GET_EVENTS, { filter }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.events as PaginatedEvents;
}
