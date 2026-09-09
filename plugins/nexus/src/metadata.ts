/**
 * @fileoverview Dynamic metadata fetcher for the Nexus data source.
 *
 * Connects to the Nexus REST API and retrieves repositories, component counts,
 * and the latest published version per component. The platform stores this
 * metadata on the instance and exposes it to the design layer (repository
 * pickers, format filters) via {@link DataSourceContext.metadata}.
 */

import type { MetadataFetcher } from '@eventium/plugin-sdk';
import { latestAssetTime, type NexusComponent } from './api.js';
import { createClient } from './client.js';

/** Number of repositories to scan for components during a sync. */
const MAX_REPOS_SCANNED = 12;
/** Maximum components to collect per repository. */
const MAX_COMPONENTS_PER_REPO = 150;
/** Number of recent components retained in metadata. */
const MAX_RECENT = 40;

/** A component summarized for storage and picker rendering. */
export interface NexusComponentSummary {
  /** Stable key: `group:name` (or just name when ungrouped). */
  key: string;
  group: string | null;
  name: string;
  version: string;
  repository: string;
  format: string;
  lastModified: string | null;
}

/** Structured metadata returned by {@link fetchMetadata}. */
export interface NexusMetadata {
  repositories: Array<{ name: string; format: string; type: string; online: boolean }>;
  repositoryCount: number;
  formats: string[];
  componentCount: number;
  /** Latest version per component, ideal for a version board. */
  latestVersions: NexusComponentSummary[];
  /** Most recently published components across all scanned repositories. */
  recentComponents: NexusComponentSummary[];
  connectedAt: string;
}

/** Compares two version strings numerically (newest first when used as sort). */
function compareVersions(a: string, b: string): number {
  return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
}

/** Builds a stable component key from group + name. */
function componentKey(group: string | null, name: string): string {
  return group ? `${group}:${name}` : name;
}

/** Summarizes a live component for storage. */
function summarize(component: NexusComponent): NexusComponentSummary {
  return {
    key: componentKey(component.group, component.name),
    group: component.group,
    name: component.name,
    version: component.version,
    repository: component.repository,
    format: component.format,
    lastModified: latestAssetTime(component),
  };
}

/**
 * Fetches dynamic metadata from a Nexus instance.
 * @param ctx - Data-source context carrying the instance configuration.
 * @returns Structured metadata for storage on the instance.
 */
export const fetchMetadata: MetadataFetcher = async (ctx) => {
  const client = createClient(ctx.config);

  const repositories = await client.getRepositories();
  const formats = Array.from(new Set(repositories.map((r) => r.format))).sort();

  // Scan a bounded set of repositories for components.
  const summaries: NexusComponentSummary[] = [];
  for (const repo of repositories.slice(0, MAX_REPOS_SCANNED)) {
    try {
      const components = await client.getComponents(repo.name, MAX_COMPONENTS_PER_REPO);
      for (const c of components) {
        summaries.push(summarize(c));
      }
    } catch {
      // Skip repositories that cannot be listed (permissions, empty, etc.).
    }
  }

  // Latest version per component key.
  const latestByKey = new Map<string, NexusComponentSummary>();
  for (const s of summaries) {
    const existing = latestByKey.get(s.key);
    if (!existing || compareVersions(s.version, existing.version) < 0) {
      latestByKey.set(s.key, s);
    }
  }
  const latestVersions = Array.from(latestByKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // Most recently modified components.
  const recentComponents = [...summaries]
    .sort((a, b) => (b.lastModified ?? '').localeCompare(a.lastModified ?? ''))
    .slice(0, MAX_RECENT);

  return {
    repositories: repositories.map((r) => ({
      name: r.name,
      format: r.format,
      type: r.type,
      online: r.online ?? true,
    })),
    repositoryCount: repositories.length,
    formats,
    componentCount: summaries.length,
    latestVersions,
    recentComponents,
    connectedAt: new Date().toISOString(),
  } satisfies NexusMetadata;
};
