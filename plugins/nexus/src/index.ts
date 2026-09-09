/**
 * @fileoverview Public entry point for the Nexus data-source plugin.
 *
 * Exports the named members of the {@link DataSourceModule} contract the
 * platform loads and drives: `capabilities` (declared surface), `queryResource`
 * (entity reads), `fetchMetadata` (dynamic sync), and `handleWebhook` (inbound
 * webhook → normalized event). No UI, panels, or view models are produced here.
 */

export type { NexusAsset, NexusClientConfig, NexusComponent, NexusRepository } from './api.js';
export { latestAssetTime, NexusApiClient, NexusApiError } from './api.js';
export { capabilities } from './capabilities.js';
export type { NexusComponentSummary, NexusMetadata } from './metadata.js';
export { fetchMetadata } from './metadata.js';
export { queryResource } from './resource.js';
export { handleWebhook } from './webhook-handler.js';
