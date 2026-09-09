/**
 * @fileoverview GitLab capability descriptor.
 *
 * The machine-readable surface the platform reads at discovery time: the
 * queryable entities (with typed fields and scope params) and the event types
 * this source streams. Derived directly from the GitLab API shapes in `api.ts`.
 * No UI, no display concerns — just the vocabulary.
 */

import { type Capabilities, f } from '@eventium/plugin-sdk';

/**
 * Pipeline status values GitLab can report, surfaced as an enum field so the
 * design layer can offer them for filtering/binding.
 */
const PIPELINE_STATUSES = [
  'created',
  'waiting_for_resource',
  'preparing',
  'pending',
  'running',
  'success',
  'failed',
  'canceled',
  'skipped',
  'manual',
  'scheduled',
] as const;

/** Merge request lifecycle states. */
const MERGE_REQUEST_STATES = ['opened', 'closed', 'locked', 'merged'] as const;

/**
 * The complete capability surface of the GitLab data source.
 *
 * Entities:
 * - `repository`  — projects accessible to the token (derived from GitLabProject).
 * - `pipeline`    — recent CI/CD pipelines of a project (scoped by `projectId`).
 * - `merge_request` — merge requests of a project (scoped by `projectId`).
 *
 * Events: the eight webhook-driven types covering merge requests, pipelines,
 * pushes, tags, and releases.
 */
export const capabilities: Capabilities = {
  entities: [
    {
      key: 'repository',
      label: 'Repository',
      description: 'GitLab projects accessible to the configured access token.',
      fields: [
        f.number('id', 'Project ID'),
        f.string('name', 'Name'),
        f.string('fullPath', 'Full Path', {
          description: 'Namespace-qualified path, e.g. group/subgroup/project.',
        }),
        f.string('namespace', 'Namespace'),
        f.string('defaultBranch', 'Default Branch'),
        f.string('description', 'Description'),
        f.url('url', 'Web URL'),
        f.datetime('lastActivityAt', 'Last Activity'),
      ],
    },
    {
      key: 'pipeline',
      label: 'Pipeline',
      description: 'Recent CI/CD pipelines for a project.',
      params: [
        {
          key: 'projectId',
          label: 'Project ID',
          type: { kind: 'number' },
          required: true,
        },
      ],
      fields: [
        f.number('id', 'Pipeline ID'),
        f.number('iid', 'Internal ID'),
        f.enum('status', 'Status', PIPELINE_STATUSES),
        f.string('ref', 'Ref'),
        f.string('sha', 'Commit SHA'),
        f.string('source', 'Source'),
        f.string('triggeredBy', 'Triggered By'),
        f.url('url', 'Web URL'),
        f.datetime('createdAt', 'Created'),
        f.datetime('updatedAt', 'Updated'),
      ],
    },
    {
      key: 'merge_request',
      label: 'Merge Request',
      description: 'Merge requests for a project.',
      params: [
        {
          key: 'projectId',
          label: 'Project ID',
          type: { kind: 'number' },
          required: true,
        },
      ],
      fields: [
        f.number('id', 'MR ID'),
        f.number('iid', 'Internal ID'),
        f.string('title', 'Title'),
        f.enum('state', 'State', MERGE_REQUEST_STATES),
        f.string('author', 'Author'),
        f.string('sourceBranch', 'Source Branch'),
        f.string('targetBranch', 'Target Branch'),
        f.string('mergeStatus', 'Merge Status'),
        f.boolean('draft', 'Draft'),
        f.json('labels', 'Labels'),
        f.url('url', 'Web URL'),
        f.datetime('createdAt', 'Created'),
        f.datetime('updatedAt', 'Updated'),
      ],
    },
  ],
  events: [
    {
      type: 'gitlab.merge_request.opened',
      label: 'Merge Request Opened',
      description: 'A new merge request has been created in a GitLab project.',
      defaultSeverity: 'INFO',
    },
    {
      type: 'gitlab.merge_request.merged',
      label: 'Merge Request Merged',
      description: 'A merge request has been merged into its target branch.',
      defaultSeverity: 'INFO',
    },
    {
      type: 'gitlab.merge_request.closed',
      label: 'Merge Request Closed',
      description: 'A merge request has been closed without merging.',
      defaultSeverity: 'INFO',
    },
    {
      type: 'gitlab.pipeline.success',
      label: 'Pipeline Succeeded',
      description: 'A CI/CD pipeline has completed successfully.',
      defaultSeverity: 'INFO',
    },
    {
      type: 'gitlab.pipeline.failed',
      label: 'Pipeline Failed',
      description: 'A CI/CD pipeline has failed.',
      defaultSeverity: 'ERROR',
    },
    {
      type: 'gitlab.push',
      label: 'Push',
      description: 'Commits have been pushed to a branch.',
      defaultSeverity: 'INFO',
    },
    {
      type: 'gitlab.tag',
      label: 'Tag Created',
      description: 'A new tag has been created in a GitLab project.',
      defaultSeverity: 'INFO',
    },
    {
      type: 'gitlab.release',
      label: 'Release Published',
      description: 'A new release has been published in a GitLab project.',
      defaultSeverity: 'WARNING',
    },
  ],
};
