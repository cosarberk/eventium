/**
 * @fileoverview GitLab data-source plugin entry module.
 *
 * A pure data source: it ships no UI and decides nothing about display. It only
 * (1) declares its {@link capabilities}, (2) answers resource queries via
 * {@link queryResource}, (3) normalizes inbound webhooks into events via
 * {@link handleWebhook}, and optionally fetches instance {@link fetchMetadata}
 * and self-manages its {@link webhookTargets}.
 *
 * The platform loads these named exports (matching `DataSourceModule`) and
 * drives them; there is no class, no decorators, no lifecycle.
 *
 * Config: `url` (instance base URL), `token` (PAT with `api` scope), and
 * optional `webhookSecret` (verified against the `X-Gitlab-Token` header).
 */

export type {
  GitLabClientConfig,
  GitLabGroup,
  GitLabMergeRequest,
  GitLabPipeline,
  GitLabProject,
  GitLabUser,
  MergeRequestState,
  PipelineStatus,
} from './api.js';
// Public API surface re-exported for consumers of this package's types.
export { GitLabApiClient } from './api.js';
export { capabilities } from './capabilities.js';
export type {
  GitLabMergeRequestWebhookPayload,
  GitLabPipelineWebhookPayload,
  GitLabPushWebhookPayload,
  GitLabReleaseWebhookPayload,
  GitLabTagWebhookPayload,
  GitLabWebhookPayload,
} from './events.js';
export type { GitLabMetaProject } from './metadata.js';
export { fetchMetadata } from './metadata.js';
export { queryResource } from './resources.js';
export { handleWebhook } from './webhook-handler.js';
export { webhookTargets } from './webhooks.js';
