/**
 * @fileoverview GitLab webhook payload types and parsers.
 *
 * Pure functions that translate a raw GitLab webhook payload into a normalized
 * {@link EmittedEvent}. Each parser owns the mapping from GitLab's action/status
 * vocabulary to a dotted event type and an UPPERCASE severity. Parsers return
 * `null` for payloads that do not map to a tracked event type.
 */

import type { EmittedEvent } from '@eventium/plugin-sdk';

/** Shared project reference embedded in every GitLab webhook payload. */
interface WebhookProject {
  readonly id: number;
  readonly name: string;
  readonly web_url: string;
  readonly path_with_namespace: string;
}

/** GitLab merge request webhook payload (`object_kind: "merge_request"`). */
export interface GitLabMergeRequestWebhookPayload {
  readonly object_kind: 'merge_request';
  readonly event_type?: string;
  readonly user: { readonly username: string; readonly name: string };
  readonly project: WebhookProject;
  readonly object_attributes: {
    readonly id: number;
    readonly iid: number;
    readonly title: string;
    readonly description: string | null;
    readonly state: string;
    readonly action: string;
    readonly source_branch: string;
    readonly target_branch: string;
    readonly url: string;
    readonly created_at: string;
    readonly updated_at: string;
    readonly draft: boolean;
    readonly merge_status: string;
  };
}

/** GitLab pipeline webhook payload (`object_kind: "pipeline"`). */
export interface GitLabPipelineWebhookPayload {
  readonly object_kind: 'pipeline';
  readonly user: { readonly username: string; readonly name: string };
  readonly project: WebhookProject;
  readonly object_attributes: {
    readonly id: number;
    readonly ref: string;
    readonly status: string;
    readonly sha: string;
    readonly source: string;
    readonly created_at: string;
    readonly finished_at: string | null;
    readonly duration: number | null;
  };
}

/** GitLab push webhook payload (`object_kind: "push"`). */
export interface GitLabPushWebhookPayload {
  readonly object_kind: 'push';
  readonly event_name: 'push';
  readonly ref: string;
  readonly before: string;
  readonly after: string;
  readonly user_username: string;
  readonly user_name: string;
  readonly project: WebhookProject;
  readonly commits: readonly {
    readonly id: string;
    readonly message: string;
    readonly title: string;
    readonly timestamp: string;
    readonly url: string;
    readonly author: { readonly name: string; readonly email: string };
  }[];
  readonly total_commits_count: number;
}

/** GitLab tag push webhook payload (`object_kind: "tag_push"`). */
export interface GitLabTagWebhookPayload {
  readonly object_kind: 'tag_push';
  readonly event_name: 'tag_push';
  readonly ref: string;
  readonly user_username: string;
  readonly user_name: string;
  readonly project: WebhookProject;
}

/** GitLab release webhook payload (`object_kind: "release"`). */
export interface GitLabReleaseWebhookPayload {
  readonly object_kind: 'release';
  readonly action: string;
  readonly name: string;
  readonly tag: string;
  readonly description: string | null;
  readonly url: string;
  readonly project: WebhookProject;
}

/** Union of every GitLab webhook payload this plugin understands. */
export type GitLabWebhookPayload =
  | GitLabMergeRequestWebhookPayload
  | GitLabPipelineWebhookPayload
  | GitLabPushWebhookPayload
  | GitLabTagWebhookPayload
  | GitLabReleaseWebhookPayload;

/**
 * Parse a merge request webhook into a normalized event.
 * @returns An {@link EmittedEvent}, or `null` for untracked actions.
 */
export function parseMergeRequestEvent(
  payload: GitLabMergeRequestWebhookPayload,
): EmittedEvent | null {
  const attrs = payload.object_attributes;
  const project = payload.project;

  let eventType: string;
  let severity: EmittedEvent['severity'];
  switch (attrs.action) {
    case 'open':
      eventType = 'gitlab.merge_request.opened';
      severity = 'INFO';
      break;
    case 'merge':
      eventType = 'gitlab.merge_request.merged';
      severity = 'INFO';
      break;
    case 'close':
      eventType = 'gitlab.merge_request.closed';
      severity = 'INFO';
      break;
    default:
      return null;
  }

  return {
    eventType,
    severity,
    title: `MR !${attrs.iid} ${attrs.action}: ${attrs.title}`,
    description: attrs.description ?? undefined,
    payload: {
      projectId: project.id,
      projectName: project.name,
      projectPath: project.path_with_namespace,
      mrId: attrs.id,
      mrIid: attrs.iid,
      sourceBranch: attrs.source_branch,
      targetBranch: attrs.target_branch,
      author: payload.user.username,
      draft: attrs.draft,
      mergeStatus: attrs.merge_status,
      url: attrs.url,
    },
  };
}

/**
 * Parse a pipeline webhook into a normalized event.
 * @returns An {@link EmittedEvent}, or `null` for untracked statuses.
 */
export function parsePipelineEvent(payload: GitLabPipelineWebhookPayload): EmittedEvent | null {
  const attrs = payload.object_attributes;
  const project = payload.project;

  let eventType: string;
  let severity: EmittedEvent['severity'];
  switch (attrs.status) {
    case 'success':
      eventType = 'gitlab.pipeline.success';
      severity = 'INFO';
      break;
    case 'failed':
      eventType = 'gitlab.pipeline.failed';
      severity = 'ERROR';
      break;
    default:
      return null;
  }

  return {
    eventType,
    severity,
    title: `Pipeline #${attrs.id} ${attrs.status} on ${attrs.ref}`,
    description: `Pipeline for ref \`${attrs.ref}\` (${attrs.sha.slice(0, 8)}) finished with status: ${attrs.status}`,
    payload: {
      projectId: project.id,
      projectName: project.name,
      projectPath: project.path_with_namespace,
      pipelineId: attrs.id,
      ref: attrs.ref,
      sha: attrs.sha,
      source: attrs.source,
      duration: attrs.duration,
      user: payload.user.username,
      url: `${project.web_url}/-/pipelines/${attrs.id}`,
    },
  };
}

/**
 * Parse a push webhook into a normalized event.
 * @returns An {@link EmittedEvent}.
 */
export function parsePushEvent(payload: GitLabPushWebhookPayload): EmittedEvent {
  const branch = payload.ref.replace(/^refs\/heads\//, '');
  const project = payload.project;

  return {
    eventType: 'gitlab.push',
    severity: 'INFO',
    title: `${payload.user_username} pushed ${payload.total_commits_count} commit(s) to ${branch}`,
    description: payload.commits
      .slice(0, 10)
      .map((c) => `- ${c.title} (${c.id.slice(0, 8)})`)
      .join('\n'),
    payload: {
      projectId: project.id,
      projectName: project.name,
      projectPath: project.path_with_namespace,
      branch,
      beforeSha: payload.before,
      afterSha: payload.after,
      totalCommits: payload.total_commits_count,
      commits: payload.commits.slice(0, 20).map((c) => ({
        id: c.id,
        title: c.title,
        author: c.author.name,
        url: c.url,
      })),
      user: payload.user_username,
      url: `${project.web_url}/-/compare/${payload.before.slice(0, 8)}...${payload.after.slice(0, 8)}`,
    },
  };
}

/**
 * Parse a tag push webhook into a normalized event.
 * @returns An {@link EmittedEvent}.
 */
export function parseTagEvent(payload: GitLabTagWebhookPayload): EmittedEvent {
  const tagName = payload.ref.replace(/^refs\/tags\//, '');
  const project = payload.project;

  return {
    eventType: 'gitlab.tag',
    severity: 'INFO',
    title: `Tag ${tagName} created by ${payload.user_username}`,
    payload: {
      projectId: project.id,
      projectName: project.name,
      projectPath: project.path_with_namespace,
      tag: tagName,
      user: payload.user_username,
      url: `${project.web_url}/-/tags/${encodeURIComponent(tagName)}`,
    },
  };
}

/**
 * Parse a release webhook into a normalized event.
 * @returns An {@link EmittedEvent}, or `null` for non-`create` actions.
 */
export function parseReleaseEvent(payload: GitLabReleaseWebhookPayload): EmittedEvent | null {
  if (payload.action !== 'create') {
    return null;
  }
  const project = payload.project;

  return {
    eventType: 'gitlab.release',
    severity: 'WARNING',
    title: `Release ${payload.name || payload.tag} published in ${project.path_with_namespace}`,
    description: payload.description ?? undefined,
    payload: {
      projectId: project.id,
      projectName: project.name,
      projectPath: project.path_with_namespace,
      release: payload.name,
      tag: payload.tag,
      url: payload.url,
    },
  };
}
