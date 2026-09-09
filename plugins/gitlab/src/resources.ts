/**
 * @fileoverview GitLab resource resolver.
 *
 * Answers {@link ResourceQuery}s by calling the GitLab REST API and flattening
 * each record into a row keyed by the field keys declared in `capabilities.ts`.
 * This carries the data logic that previously produced panel view models, now
 * expressed as plain field-keyed rows.
 */

import type {
  DataSourceContext,
  ResourceQuery,
  ResourceResolver,
  ResourceResult,
} from '@eventium/plugin-sdk';
import {
  GitLabApiClient,
  type GitLabMergeRequest,
  type GitLabPipeline,
  type GitLabProject,
  type MergeRequestState,
} from './api.js';

/** Default upper bound on rows when a query omits `limit`. */
const DEFAULT_LIMIT = 20;

/** Build a GitLab API client from an instance's configuration. */
function clientFrom(ctx: DataSourceContext): GitLabApiClient {
  return new GitLabApiClient({
    url: ctx.config.url as string,
    token: ctx.config.token as string,
  });
}

/** Read a required numeric param, coercing strings; `undefined` when absent. */
function numericParam(query: ResourceQuery, key: string): number | undefined {
  const raw = query.params?.[key];
  if (raw === undefined || raw === null || raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** Flatten a project into a `repository` row. */
function repositoryRow(project: GitLabProject): Record<string, unknown> {
  return {
    id: project.id,
    name: project.name,
    fullPath: project.path_with_namespace,
    namespace: project.namespace?.name ?? '',
    defaultBranch: project.default_branch,
    description: project.description ?? '',
    url: project.web_url,
    lastActivityAt: project.last_activity_at,
  };
}

/** Flatten a pipeline into a `pipeline` row. */
function pipelineRow(pipeline: GitLabPipeline): Record<string, unknown> {
  return {
    id: pipeline.id,
    iid: pipeline.iid,
    status: pipeline.status,
    ref: pipeline.ref,
    sha: pipeline.sha,
    source: pipeline.source,
    triggeredBy: pipeline.user?.name ?? '',
    url: pipeline.web_url,
    createdAt: pipeline.created_at,
    updatedAt: pipeline.updated_at,
  };
}

/** Flatten a merge request into a `merge_request` row. */
function mergeRequestRow(mr: GitLabMergeRequest): Record<string, unknown> {
  return {
    id: mr.id,
    iid: mr.iid,
    title: mr.title,
    state: mr.state,
    author: mr.author?.name ?? '',
    sourceBranch: mr.source_branch,
    targetBranch: mr.target_branch,
    mergeStatus: mr.merge_status,
    draft: mr.draft,
    labels: mr.labels,
    url: mr.web_url,
    createdAt: mr.created_at,
    updatedAt: mr.updated_at,
  };
}

/**
 * Resolve a resource query against the GitLab API.
 *
 * - `repository`     → the token's accessible projects.
 * - `pipeline`       → recent pipelines for the `projectId` param.
 * - `merge_request`  → merge requests (all states) for the `projectId` param.
 *
 * Entities requiring `projectId` return an empty result set (with a warning)
 * when the param is missing, rather than throwing.
 */
export const queryResource: ResourceResolver = async (
  query: ResourceQuery,
  ctx: DataSourceContext,
): Promise<ResourceResult> => {
  const client = clientFrom(ctx);
  const limit = query.limit ?? DEFAULT_LIMIT;

  switch (query.entity) {
    case 'repository': {
      const projects = await client.getProjects({ perPage: limit });
      return { rows: projects.map(repositoryRow) };
    }

    case 'pipeline': {
      const projectId = numericParam(query, 'projectId');
      if (projectId === undefined) {
        ctx.logger.warn('pipeline query missing required projectId param');
        return { rows: [] };
      }
      const pipelines = await client.getPipelines(projectId, { perPage: limit });
      return { rows: pipelines.map(pipelineRow) };
    }

    case 'merge_request': {
      const projectId = numericParam(query, 'projectId');
      if (projectId === undefined) {
        ctx.logger.warn('merge_request query missing required projectId param');
        return { rows: [] };
      }
      const state = (query.params?.state as MergeRequestState | undefined) ?? 'all';
      const mrs = await client.getMergeRequests(projectId, state, { perPage: limit });
      return { rows: mrs.map(mergeRequestRow) };
    }

    default:
      ctx.logger.warn('Unknown GitLab entity requested', { entity: query.entity });
      return { rows: [] };
  }
};
