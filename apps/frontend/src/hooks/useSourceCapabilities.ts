/**
 * @fileoverview Hook exposing the binding vocabulary for the design layer.
 *
 * Loads the queryable capability surface of every enabled data-source instance
 * (`sourceType:entity.field`). The binding picker reads this to let a user pick a
 * source instance, an entity, and a field for any slot — the mechanism that makes
 * bindings cross-plugin.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchSourceCapabilities } from '@/services/plugin.service';
import type { InstanceCapability } from '@/types';

/** Query key for the source-capabilities query. */
const sourceCapabilitiesKey = ['plugins', 'sourceCapabilities'] as const;

/**
 * Fetches the capability surface of every enabled instance for binding pickers.
 * @returns TanStack Query result with the list of instance capabilities.
 */
export function useSourceCapabilities() {
  const query = useQuery({
    queryKey: sourceCapabilitiesKey,
    queryFn: fetchSourceCapabilities,
    staleTime: 60_000,
  });

  const capabilities: InstanceCapability[] = query.data ?? [];
  return { capabilities, isLoading: query.isLoading, error: query.error as Error | null };
}
