/**
 * @file Barrel export for the plugins module.
 */

export { DataSourceManager, type SourceRuntime } from './manager.js';
export { registerSourcesFromManifests } from './registry.js';
export type { LoadedSource, SourceManifest } from './types.js';
