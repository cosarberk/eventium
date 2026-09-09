/**
 * @fileoverview React hook for event data management.
 * Provides query for fetching events. Components should use this hook
 * instead of calling services directly.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '@/services/event.service';
import type { EventFilter } from '@/types';

/** Query key factory for event-related queries */
const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filter?: EventFilter) => [...eventKeys.lists(), filter] as const,
};

/**
 * Hook to fetch a paginated list of events with optional filtering.
 * @param filter - Optional filter parameters
 * @returns TanStack Query result with paginated event data
 */
export function useEvents(filter?: EventFilter) {
  return useQuery({
    queryKey: eventKeys.list(filter),
    queryFn: () => fetchEvents(filter),
    refetchInterval: 30000,
  });
}
