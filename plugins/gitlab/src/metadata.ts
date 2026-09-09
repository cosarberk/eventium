/**
 * @fileoverview GitLab metadata fetcher.
 *
 * Pulls the list of projects the configured token can see and stores it on the
 * instance. This metadata backs the `projectId` scope params of the `pipeline`
 * and `merge_request` entities (letting the UI offer a project picker) and is
 * available to `queryResource` via {@link DataSourceContext.metadata}.
 */

import type { DataSourceContext, MetadataFetcher } from '@eventium/plugin-sdk';
import { GitLabApiClient } from './api.js';

/** Number of projects to pull into instance metadata. */
const PROJECT_PAGE_SIZE = 100;

/** A project entry as stored in synced metadata. */
export interface GitLabMetaProject {
  readonly id: number;
  readonly name: string;
  readonly fullPath: string;
  readonly url: string;
  readonly defaultBranch: string;
  readonly lastActivity: string;
}

/**
 * Fetch dynamic metadata (the accessible project list) from GitLab.
 *
 * @returns A record with `projects`, `projectCount`, and `connectedAt`.
 */
export const fetchMetadata: MetadataFetcher = async (
  ctx: DataSourceContext,
): Promise<Record<string, unknown>> => {
  const client = new GitLabApiClient({
    url: ctx.config.url as string,
    token: ctx.config.token as string,
  });

  const projects = await client.getProjects({ perPage: PROJECT_PAGE_SIZE });
  const mapped: GitLabMetaProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    fullPath: p.path_with_namespace,
    url: p.web_url,
    defaultBranch: p.default_branch,
    lastActivity: p.last_activity_at,
  }));

  ctx.logger.info('Fetched GitLab metadata', { projectCount: mapped.length });

  return {
    projects: mapped,
    projectCount: mapped.length,
    connectedAt: new Date().toISOString(),
  };
};
