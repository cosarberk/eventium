/**
 * @fileoverview Service layer for plugin management operations.
 * Handles installation, configuration, and lifecycle management of plugins via urql.
 */
import { urqlClient } from '@/api/client';
import {
  CONFIGURE_PLUGIN,
  GET_AVAILABLE_PLUGINS,
  GET_PLUGINS,
  GET_SERVER_CONFIG,
  GET_SOURCE_CAPABILITIES,
  GET_WEBHOOK_TARGETS,
  INSTALL_PLUGIN,
  SYNC_PLUGIN_METADATA,
  SYNC_WEBHOOK_TARGETS,
  TOGGLE_PLUGIN,
  UNINSTALL_PLUGIN,
} from '@/api/graphql';
import type { AvailablePlugin, InstanceCapability, Plugin, WebhookTarget } from '@/types';

/**
 * Fetches the resolved public webhook base URL from the server.
 * @returns The webhook base URL (e.g. a tunnel/domain), or null when unresolved
 */
export async function fetchWebhookBaseUrl(): Promise<string | null> {
  const result = await urqlClient
    .query(GET_SERVER_CONFIG, {}, { requestPolicy: 'cache-and-network' })
    .toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data?.serverConfig?.webhookBaseUrl as string | null) ?? null;
}

/**
 * Fetches all available plugin definitions from the registry.
 * @returns Array of available plugin definitions
 */
export async function fetchAvailablePlugins(): Promise<AvailablePlugin[]> {
  const result = await urqlClient.query(GET_AVAILABLE_PLUGINS, {}).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.availablePlugins as AvailablePlugin[];
}

/**
 * Fetches the queryable capability surface of every enabled data-source instance.
 * This is the vocabulary the binding picker offers (`sourceType:entity.field`).
 * @returns One entry per enabled instance, with its capability descriptor.
 */
export async function fetchSourceCapabilities(): Promise<InstanceCapability[]> {
  const result = await urqlClient.query(GET_SOURCE_CAPABILITIES, {}).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data?.sourceCapabilities as InstanceCapability[] | null) ?? [];
}

/**
 * Fetches all installed plugin instances.
 * @returns Array of plugin instances
 */
export async function fetchPlugins(): Promise<Plugin[]> {
  const result = await urqlClient.query(GET_PLUGINS, {}).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.plugins as Plugin[];
}

/**
 * Installs a new plugin instance.
 * @param input - Plugin installation data
 * @returns The created plugin instance
 */
export async function installPlugin(input: {
  pluginId: string;
  name: string;
  config?: Record<string, unknown>;
}): Promise<Plugin> {
  const result = await urqlClient.mutation(INSTALL_PLUGIN, { input }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.installPlugin as Plugin;
}

/**
 * Uninstalls a plugin instance.
 * @param id - The plugin instance ID to uninstall
 * @returns The removed plugin instance
 */
export async function uninstallPlugin(id: string): Promise<Plugin> {
  const result = await urqlClient.mutation(UNINSTALL_PLUGIN, { id }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.uninstallPlugin as Plugin;
}

/**
 * Enables or disables a plugin instance.
 * @param id - The plugin instance ID
 * @param enabled - Whether the plugin should be enabled
 * @returns The updated plugin instance
 */
export async function togglePlugin(
  id: string,
  enabled: boolean,
): Promise<Pick<Plugin, 'id' | 'enabled'>> {
  const result = await urqlClient.mutation(TOGGLE_PLUGIN, { id, enabled }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.togglePlugin as Pick<Plugin, 'id' | 'enabled'>;
}

/**
 * Updates the configuration for an installed plugin instance.
 * @param id - The plugin instance ID
 * @param pluginConfig - Key-value configuration object
 * @returns The updated plugin instance
 */
export async function configurePlugin(
  id: string,
  pluginConfig: Record<string, unknown>,
): Promise<Pick<Plugin, 'id' | 'config'>> {
  const result = await urqlClient
    .mutation(CONFIGURE_PLUGIN, { id, input: { config: pluginConfig } })
    .toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.configurePlugin as Pick<Plugin, 'id' | 'config'>;
}

/**
 * Triggers a metadata sync for a plugin instance (re-fetches from external API).
 * @param id - The plugin instance ID
 * @returns The updated plugin instance with fresh metadata
 */
export async function syncPluginMetadata(
  id: string,
): Promise<Pick<Plugin, 'id' | 'metadata' | 'syncedAt'>> {
  const result = await urqlClient.mutation(SYNC_PLUGIN_METADATA, { id }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.syncPluginMetadata as Pick<Plugin, 'id' | 'metadata' | 'syncedAt'>;
}

/**
 * Fetches the monitorable projects for a plugin instance and whether the
 * Eventium webhook is currently installed on each.
 * @param pluginInstanceId - The plugin instance ID
 * @param webhookUrl - The Eventium webhook URL GitLab should call
 * @returns Array of webhook targets
 */
export async function fetchWebhookTargets(
  pluginInstanceId: string,
  webhookUrl: string,
): Promise<WebhookTarget[]> {
  const result = await urqlClient
    .query(
      GET_WEBHOOK_TARGETS,
      { pluginInstanceId, webhookUrl },
      { requestPolicy: 'cache-and-network' },
    )
    .toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data?.webhookTargets as WebhookTarget[] | null) ?? [];
}

/**
 * Registers/unregisters the Eventium webhook so the monitored target set
 * matches `targetIds`.
 * @param pluginInstanceId - The plugin instance ID
 * @param targetIds - Ids of targets that should be monitored
 * @param webhookUrl - The Eventium webhook URL the source should call
 * @returns The refreshed list of webhook targets
 */
export async function syncWebhookTargets(
  pluginInstanceId: string,
  targetIds: string[],
  webhookUrl: string,
): Promise<WebhookTarget[]> {
  const result = await urqlClient
    .mutation(SYNC_WEBHOOK_TARGETS, {
      pluginInstanceId,
      targetIds,
      webhookUrl,
    })
    .toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data?.syncWebhookTargets as WebhookTarget[] | null) ?? [];
}
