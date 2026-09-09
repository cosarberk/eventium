/**
 * @fileoverview GitLab webhook handler.
 *
 * Verifies the shared secret, dispatches the payload by its `X-Gitlab-Event`
 * header to the matching parser in `events.ts`, and emits the resulting
 * normalized event into the platform stream via `ctx.emitEvent`.
 */

import {
  type EmittedEvent,
  readHeader,
  type StreamContext,
  verifyWebhookSecret,
  WebhookAuthError,
  type WebhookHandler,
} from '@eventium/plugin-sdk';
import {
  type GitLabMergeRequestWebhookPayload,
  type GitLabPipelineWebhookPayload,
  type GitLabPushWebhookPayload,
  type GitLabReleaseWebhookPayload,
  type GitLabTagWebhookPayload,
  parseMergeRequestEvent,
  parsePipelineEvent,
  parsePushEvent,
  parseReleaseEvent,
  parseTagEvent,
} from './events.js';

/** Header GitLab sets to name the hook (e.g. `Merge Request Hook`). */
const EVENT_HEADER = 'x-gitlab-event';
/** Header GitLab echoes the configured secret token in. */
const SECRET_HEADER = 'x-gitlab-token';

/**
 * Dispatch a payload to the parser for its GitLab event header.
 * @returns The parsed event, or `null` when the header/action is untracked.
 */
function parseByHeader(eventHeader: string, payload: unknown): EmittedEvent | null {
  switch (eventHeader) {
    case 'Merge Request Hook':
      return parseMergeRequestEvent(payload as GitLabMergeRequestWebhookPayload);
    case 'Pipeline Hook':
      return parsePipelineEvent(payload as GitLabPipelineWebhookPayload);
    case 'Push Hook':
      return parsePushEvent(payload as GitLabPushWebhookPayload);
    case 'Tag Push Hook':
      return parseTagEvent(payload as GitLabTagWebhookPayload);
    case 'Release Hook':
      return parseReleaseEvent(payload as GitLabReleaseWebhookPayload);
    default:
      return null;
  }
}

/**
 * Handle an inbound GitLab webhook: authenticate, parse, and emit.
 *
 * The secret is verified against the `webhookSecret` config value via the
 * `X-Gitlab-Token` header (a no-op when no secret is configured). Untracked
 * event types are logged and ignored.
 */
export const handleWebhook: WebhookHandler = async (
  payload: unknown,
  headers: Readonly<Record<string, string | undefined>>,
  ctx: StreamContext,
): Promise<void> => {
  const secret = ctx.config.webhookSecret as string | undefined;
  if (!verifyWebhookSecret(headers, secret, [SECRET_HEADER])) {
    throw new WebhookAuthError('Invalid GitLab webhook secret');
  }

  const eventHeader = readHeader(headers, EVENT_HEADER) ?? '';
  const event = parseByHeader(eventHeader, payload);

  if (!event) {
    ctx.logger.warn('Ignoring untracked GitLab webhook event', { eventHeader });
    return;
  }

  await ctx.emitEvent(event);
  ctx.logger.info('Processed GitLab webhook', { eventType: event.eventType });
};
