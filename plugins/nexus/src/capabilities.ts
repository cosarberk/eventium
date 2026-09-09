/**
 * @fileoverview Nexus capability descriptor.
 *
 * Declares the queryable entities (repositories, components) and the event
 * types this data source streams. The platform's design layer derives the whole
 * binding vocabulary (`nexus:repository.online`, `nexus:component.version`, …)
 * and the notification catalog from this descriptor — the plugin ships no UI.
 */

import { type Capabilities, f } from '@eventium/plugin-sdk';

/**
 * Repository formats Nexus commonly hosts. Used to type the `format` field as an
 * enum for the binding picker; unknown formats still flow through as raw values.
 */
const NEXUS_FORMATS = [
  'maven2',
  'npm',
  'docker',
  'nuget',
  'pypi',
  'raw',
  'yum',
  'apt',
  'helm',
  'go',
  'conda',
  'r',
  'rubygems',
  'cocoapods',
  'p2',
] as const;

/**
 * The complete capability surface of the Nexus data source: two queryable
 * entities and four streamed event types.
 */
export const capabilities: Capabilities = {
  entities: [
    {
      key: 'repository',
      label: 'Repository',
      description: 'Repositories hosted or proxied by the Nexus instance.',
      fields: [
        f.string('name', 'Name', { description: 'Repository name (unique per instance).' }),
        f.enum('format', 'Format', [...NEXUS_FORMATS], {
          description: 'Package format served by the repository.',
        }),
        f.string('type', 'Type', { description: 'Repository type (hosted, proxy, or group).' }),
        f.boolean('online', 'Online', {
          description: 'Whether the repository is currently online.',
        }),
      ],
    },
    {
      key: 'component',
      label: 'Component',
      description: 'Published artifacts (components) within a repository.',
      params: [
        {
          key: 'repository',
          label: 'Repository',
          type: { kind: 'string' },
          required: true,
        },
      ],
      fields: [
        f.string('id', 'ID', { description: 'Stable Nexus component id.' }),
        f.string('name', 'Name', { description: 'Component (artifact) name.' }),
        f.string('group', 'Group', { description: 'Namespace/group of the component.' }),
        f.string('version', 'Version', { description: 'Published version string.' }),
        f.enum('format', 'Format', [...NEXUS_FORMATS], {
          description: 'Package format of the component.',
        }),
        f.string('repository', 'Repository', {
          description: 'Repository the component belongs to.',
        }),
        f.datetime('lastModified', 'Last Modified', {
          description: 'Timestamp of the most recently modified asset.',
        }),
      ],
    },
  ],
  events: [
    {
      type: 'nexus.component.published',
      label: 'Component Published',
      description: 'A new artifact/component version was published to a repository.',
      defaultSeverity: 'INFO',
    },
    {
      type: 'nexus.component.updated',
      label: 'Component Updated',
      description: 'An existing component was updated.',
      defaultSeverity: 'INFO',
    },
    {
      type: 'nexus.component.deleted',
      label: 'Component Deleted',
      description: 'A component was deleted from a repository.',
      defaultSeverity: 'WARNING',
    },
    {
      type: 'nexus.repository.unhealthy',
      label: 'Repository Unhealthy',
      description: 'A repository reported an unhealthy status.',
      defaultSeverity: 'ERROR',
    },
  ],
};
