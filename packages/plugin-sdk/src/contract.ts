/**
 * @fileoverview The data-source plugin contract.
 *
 * A plugin is a pure data source. Its entry module exports a set of named
 * functions/values the platform loads and drives. There is exactly one contract
 * (no class hierarchy, no decorators): declare capabilities, answer resource
 * queries, and optionally translate inbound webhooks into events.
 *
 * A minimal plugin:
 * ```ts
 * import type { Capabilities, ResourceResolver } from '@eventium/plugin-sdk';
 *
 * export const capabilities: Capabilities = { entities: [...], events: [...] };
 * export const queryResource: ResourceResolver = async (query, ctx) => ({ rows: [...] });
 * ```
 */

import type {
  CapabilityDescriptor,
  EmittedEvent,
  ResourceQuery,
  ResourceResult,
} from '@eventium/shared';

/** Re-exported for ergonomic plugin authoring. */
export type Capabilities = CapabilityDescriptor;

/** Scoped logger handed to every plugin entry point. */
export interface PluginLogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Context passed to read-only entry points (`queryResource`, `fetchMetadata`).
 * Carries the instance's configuration and last-synced metadata.
 */
export interface DataSourceContext {
  /** The instance's user-provided configuration (url, token, …). */
  readonly config: Readonly<Record<string, unknown>>;
  /** Metadata previously produced by `fetchMetadata` (projects, repos, …). */
  readonly metadata: Readonly<Record<string, unknown>>;
  /** The concrete instance id. */
  readonly instanceId: string;
  /** Scoped logger. */
  readonly logger: PluginLogger;
}

/**
 * Context passed to `handleWebhook`. Extends {@link DataSourceContext} with the
 * ability to emit normalized events into the platform stream.
 */
export interface StreamContext extends DataSourceContext {
  /** Emit a normalized event into the platform pipeline. */
  emitEvent(event: EmittedEvent): Promise<void>;
}

/** Resolves a {@link ResourceQuery} against the external service. */
export type ResourceResolver = (
  query: ResourceQuery,
  ctx: DataSourceContext,
) => Promise<ResourceResult>;

/**
 * Pulls dynamic metadata from the external API after install/on demand
 * (project lists, repository lists, …). Stored on the instance and available to
 * `queryResource` via {@link DataSourceContext.metadata}.
 */
export type MetadataFetcher = (ctx: DataSourceContext) => Promise<Record<string, unknown>>;

/** Translates an inbound webhook into platform events via `ctx.emitEvent`. */
export type WebhookHandler = (
  payload: unknown,
  headers: Readonly<Record<string, string | undefined>>,
  ctx: StreamContext,
) => Promise<void>;

/**
 * A monitorable target (repository/project) a source can auto-install its
 * webhook on. Powers the "toggle which repos to watch" UI.
 */
export interface WebhookTarget {
  /** Stable id understood by the source. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** Full path/namespace for grouping. */
  readonly fullPath: string;
  /** Whether the Eventium webhook is currently installed on this target. */
  readonly monitored: boolean;
}

/**
 * Optional webhook self-management. When present, the platform can list a
 * source's targets and reconcile which ones carry the Eventium webhook.
 */
export interface WebhookTargetProvider {
  /** List all targets, flagging which are currently monitored. */
  list(ctx: DataSourceContext, webhookUrl: string): Promise<WebhookTarget[]>;
  /** Make the monitored set exactly `targetIds`; return the refreshed list. */
  sync(
    ctx: DataSourceContext,
    targetIds: readonly string[],
    webhookUrl: string,
  ): Promise<WebhookTarget[]>;
}

/**
 * The full shape a plugin entry module may export. All members except
 * `capabilities` and `queryResource` are optional.
 */
export interface DataSourceModule {
  readonly capabilities: CapabilityDescriptor;
  readonly queryResource: ResourceResolver;
  readonly fetchMetadata?: MetadataFetcher;
  readonly handleWebhook?: WebhookHandler;
  readonly webhookTargets?: WebhookTargetProvider;
}
