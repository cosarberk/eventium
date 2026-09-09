/**
 * @fileoverview Resource resolver for the Nexus data source.
 *
 * Answers {@link ResourceQuery}s against the live Nexus API and returns flat
 * rows keyed by the field keys declared in the capability descriptor. This
 * replaces the old panel view-model layer: the plugin returns data only, never
 * presentation.
 */

import type { ResourceQuery, ResourceResolver, ResourceResult } from '@eventium/plugin-sdk';
import { latestAssetTime, type NexusApiClient } from './api.js';
import { createClient } from './client.js';

/** Default upper bound on component rows when a query omits `limit`. */
const DEFAULT_COMPONENT_LIMIT = 200;

/** Maps live repositories to flat rows matching the `repository` entity fields. */
async function queryRepositories(client: NexusApiClient): Promise<ResourceResult> {
  const repositories = await client.getRepositories();
  return {
    rows: repositories.map((r) => ({
      name: r.name,
      format: r.format,
      type: r.type,
      online: r.online ?? true,
    })),
  };
}

/** Maps a repository's components to flat rows matching the `component` entity fields. */
async function queryComponents(
  client: NexusApiClient,
  query: ResourceQuery,
): Promise<ResourceResult> {
  const repository = query.params?.repository as string | undefined;
  if (!repository) {
    throw new Error("The 'component' entity requires a 'repository' parameter.");
  }

  const components = await client.getComponents(repository, query.limit ?? DEFAULT_COMPONENT_LIMIT);
  return {
    rows: components.map((c) => ({
      id: c.id,
      name: c.name,
      group: c.group,
      version: c.version,
      format: c.format,
      repository: c.repository,
      lastModified: latestAssetTime(c),
    })),
  };
}

/**
 * Resolves a Nexus resource query into flat rows.
 * @param query - The entity to query and its scoping params.
 * @param ctx - The data-source context (config, logger, metadata).
 * @returns Rows keyed by the queried entity's field keys.
 * @throws Error for unknown entities or missing required params.
 */
export const queryResource: ResourceResolver = async (query, ctx) => {
  const client = createClient(ctx.config);

  switch (query.entity) {
    case 'repository':
      return queryRepositories(client);
    case 'component':
      return queryComponents(client, query);
    default:
      throw new Error(`Unknown Nexus entity: ${query.entity}`);
  }
};
