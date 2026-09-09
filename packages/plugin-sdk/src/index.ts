/**
 * @fileoverview Public entry point for @eventium/plugin-sdk.
 *
 * Everything a data-source plugin author needs: the contract types, webhook
 * helpers, and field-descriptor builders. Plugins export named members matching
 * {@link DataSourceModule}; the platform loads and drives them.
 */

// Re-export the shared contract types plugins build against, so a plugin only
// needs to depend on the SDK.
export type {
  CapabilityDescriptor,
  EmittedEvent,
  EntityDescriptor,
  EntityParam,
  EventSeverity,
  FieldDescriptor,
  FieldType,
  FieldTypeKind,
  ResourceQuery,
  ResourceResult,
  StreamEventDescriptor,
} from '@eventium/shared';
export type {
  Capabilities,
  DataSourceContext,
  DataSourceModule,
  MetadataFetcher,
  PluginLogger,
  ResourceResolver,
  StreamContext,
  WebhookHandler,
  WebhookTarget,
  WebhookTargetProvider,
} from './contract.js';
export { f } from './fields.js';
export {
  isWebhookAuthError,
  readHeader,
  secretsMatch,
  verifyWebhookSecret,
  WebhookAuthError,
} from './webhook.js';
