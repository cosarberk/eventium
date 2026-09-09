/**
 * @file Data-source discovery.
 *
 * Scans the plugins directory for manifest.json files, loads each source's entry
 * module (declared via `main`), validates it exposes the required data-source
 * exports, and registers it with the {@link DataSourceManager}. No hardcoded
 * plugin references — adding a source = adding a folder with a manifest.json.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DataSourceModule } from '@eventium/plugin-sdk';
import { pluginManifestSchema, sanitizeSvgIcon } from '@eventium/shared';
import { logger } from '../utils/index.js';
import type { DataSourceManager } from './manager.js';
import type { LoadedSource, SourceManifest } from './types.js';

/**
 * Resolve the root plugins directory. Works in dev (apps/backend/src) and
 * production (apps/backend/dist).
 */
function getPluginsDir(): string {
  const backendRoot = resolve(import.meta.dirname, '..', '..');
  const projectRoot = resolve(backendRoot, '..', '..');
  return join(projectRoot, 'plugins');
}

/** Validate that a loaded module satisfies the {@link DataSourceModule} shape. */
function assertDataSourceModule(mod: unknown, sourceId: string): DataSourceModule {
  const m = mod as Partial<DataSourceModule>;
  if (!m || typeof m.queryResource !== 'function') {
    throw new Error(`Source "${sourceId}" entry module does not export queryResource()`);
  }
  if (!m.capabilities || !Array.isArray(m.capabilities.entities)) {
    throw new Error(
      `Source "${sourceId}" entry module does not export a valid capabilities object`,
    );
  }
  return m as DataSourceModule;
}

/**
 * Scan the plugins directory and register every valid data source.
 *
 * @param manager - The application's data-source manager.
 */
export async function registerSourcesFromManifests(manager: DataSourceManager): Promise<void> {
  const pluginsDir = getPluginsDir();
  let entries: string[];

  try {
    entries = await readdir(pluginsDir);
  } catch {
    logger.warn(`Plugins directory not found at ${pluginsDir}`);
    return;
  }

  for (const entry of entries) {
    const pluginDir = join(pluginsDir, entry);
    const manifestPath = join(pluginDir, 'manifest.json');

    try {
      const raw = await readFile(manifestPath, 'utf-8');
      const manifest = pluginManifestSchema.parse(JSON.parse(raw));

      // `main` is resolved relative to the plugin folder and must stay inside
      // it — a manifest is data, and data must not choose which file to import.
      const entryPath = resolve(pluginDir, manifest.main);
      if (!entryPath.startsWith(resolve(pluginDir) + sep)) {
        throw new Error(`Entry module "${manifest.main}" escapes the plugin directory`);
      }

      const entryUrl = pathToFileURL(entryPath).href;
      const mod = await import(entryUrl);
      const module = assertDataSourceModule(mod, manifest.id);

      // The icon is injected into the DOM by the marketplace UI; anything that
      // is not an inert <svg> is dropped rather than rendered.
      const icon = sanitizeSvgIcon(manifest.icon);
      if (manifest.icon && !icon) {
        logger.warn(
          `Icon for source "${manifest.id}" was rejected as unsafe markup and will not be shown.`,
        );
      }

      const sourceManifest: SourceManifest = {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author,
        icon,
        configFields: manifest.configFields,
      };

      const loaded: LoadedSource = { manifest: sourceManifest, module };
      manager.registerSource(loaded);
      logger.info(`Data source "${manifest.id}" loaded from ${manifestPath}`);
    } catch (err) {
      logger.debug(`Skipping ${pluginDir}: ${(err as Error).message ?? 'no valid manifest.json'}`);
    }
  }
}
