/**
 * @fileoverview Binding resolution service.
 *
 * Sends a page block's bindings to the backend resolver and returns shaped
 * values. Replaces the old per-panel `panelData` fetch — data now flows through
 * generic field bindings, not plugin-defined panel types.
 *
 * On the public TV view there is no session, so the active broadcast token is
 * attached instead; the backend then resolves only the bindings that belong to
 * that broadcast's own blocks.
 */

import { urqlClient } from '@/api/client';
import { RESOLVE_BINDINGS } from '@/api/graphql/queries';
import { getBroadcastToken } from '@/storage/broadcast.store';
import type { Binding, ResolvedBinding } from '@/types';

/**
 * Resolve an ordered array of bindings to shaped values. The result array is
 * index-aligned with the input.
 */
export async function resolveBindings(bindings: Binding[]): Promise<ResolvedBinding[]> {
  if (bindings.length === 0) return [];

  const res = await urqlClient
    .query(
      RESOLVE_BINDINGS,
      { bindings, broadcastToken: getBroadcastToken() },
      { requestPolicy: 'cache-and-network' },
    )
    .toPromise();

  if (res.error) throw new Error(res.error.message);
  return (res.data?.resolveBindings ?? []) as ResolvedBinding[];
}
