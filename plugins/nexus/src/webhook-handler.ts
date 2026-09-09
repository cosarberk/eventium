/**
 * @fileoverview Nexus webhook handler.
 *
 * Parses incoming Nexus "Repository Component" webhook payloads and emits
 * normalized platform events via {@link StreamContext.emitEvent}. A published
 * component raises a `nexus.component.published` event whose title reads
 * "<name> <version> published to <repository>", which the live view turns into
 * a full-screen announcement.
 */

import {
  type EmittedEvent,
  type EventSeverity,
  verifyWebhookSecret,
  WebhookAuthError,
  type WebhookHandler,
} from '@eventium/plugin-sdk';

/** Header names that may carry the shared webhook secret. */
const SECRET_HEADERS = ['x-nexus-webhook-signature', 'x-webhook-secret'] as const;

/** Shape of a Nexus repository-component webhook payload. */
interface NexusComponentWebhook {
  timestamp?: string;
  nodeId?: string;
  initiator?: string;
  action?: 'CREATED' | 'UPDATED' | 'DELETED';
  repositoryName?: string;
  component?: {
    id?: string;
    componentId?: string;
    format?: string;
    name?: string;
    group?: string | null;
    version?: string;
  };
}

/** Maps a Nexus action to an event type, severity, and human-readable verb. */
const ACTION_MAP: Record<string, { type: string; severity: EventSeverity; verb: string }> = {
  CREATED: { type: 'nexus.component.published', severity: 'INFO', verb: 'published to' },
  UPDATED: { type: 'nexus.component.updated', severity: 'INFO', verb: 'updated in' },
  DELETED: { type: 'nexus.component.deleted', severity: 'WARNING', verb: 'deleted from' },
};

/**
 * Handles an incoming Nexus webhook: verifies the optional shared secret, parses
 * the component payload, and emits a normalized event.
 * @param payload - Parsed JSON body of the webhook request.
 * @param headers - HTTP headers from the webhook request.
 * @param ctx - Stream context for emitting events and reading config.
 * @throws Error when a configured webhook secret does not match.
 */
export const handleWebhook: WebhookHandler = async (payload, headers, ctx) => {
  const webhookSecret = ctx.config.webhookSecret as string | undefined;
  if (!verifyWebhookSecret(headers, webhookSecret, SECRET_HEADERS)) {
    throw new WebhookAuthError('Invalid Nexus webhook secret');
  }

  const body = (payload ?? {}) as NexusComponentWebhook;
  const component = body.component ?? {};
  const action = body.action ?? 'CREATED';
  const mapping = ACTION_MAP[action] ?? ACTION_MAP.CREATED;

  const fullName = component.group
    ? `${component.group}:${component.name}`
    : (component.name ?? 'component');
  const version = component.version ?? '';
  const repository = body.repositoryName ?? 'unknown repository';

  const title = version
    ? `${fullName} ${version} ${mapping.verb} ${repository}`
    : `${fullName} ${mapping.verb} ${repository}`;

  const event: EmittedEvent = {
    eventType: mapping.type,
    title,
    description: `${component.format ?? 'artifact'} component ${mapping.verb} ${repository}`,
    severity: mapping.severity,
    payload: {
      // Surface key fields at the top level so the live alarm can extract them.
      version,
      name: fullName,
      repository,
      format: component.format,
      action,
      raw: body as unknown as Record<string, unknown>,
    },
  };

  await ctx.emitEvent(event);
  ctx.logger.info(`Processed Nexus webhook: ${mapping.type}`, { repository, version });
};
