/**
 * @file Backend plugin runtime types.
 *
 * The backend loads each plugin's entry module (which conforms to the SDK's
 * {@link DataSourceModule}) and keeps it alongside the manifest identity. There
 * is a single contract — see `@eventium/plugin-sdk`.
 */

import type { DataSourceModule } from '@eventium/plugin-sdk';
import type { PluginConfigFieldSchema } from '@eventium/shared';

/** Identity + install-form fields of a data source, parsed from manifest.json. */
export interface SourceManifest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly author: string;
  readonly icon?: string;
  readonly configFields: readonly PluginConfigFieldSchema[];
}

/** A discovered data source: its manifest identity and loaded runtime module. */
export interface LoadedSource {
  readonly manifest: SourceManifest;
  readonly module: DataSourceModule;
}
