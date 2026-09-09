/**
 * @fileoverview Bridges a data-source context's configuration to a typed
 * {@link NexusApiClient}. Every read-only entry point (metadata sync, resource
 * queries) resolves its client through this single helper so credential
 * plumbing lives in exactly one place.
 */

import type { DataSourceContext } from '@eventium/plugin-sdk';
import { NexusApiClient } from './api.js';

/**
 * Builds a {@link NexusApiClient} from an instance's configuration.
 * @param config - The instance config (`url`, optional `username`/`password`).
 * @returns A configured API client.
 * @throws Error when the required `url` is missing.
 */
export function createClient(config: DataSourceContext['config']): NexusApiClient {
  const url = config.url as string | undefined;
  if (!url) {
    throw new Error("Nexus plugin requires a 'url' configuration value.");
  }
  return new NexusApiClient({
    url,
    username: config.username as string | undefined,
    password: config.password as string | undefined,
  });
}
