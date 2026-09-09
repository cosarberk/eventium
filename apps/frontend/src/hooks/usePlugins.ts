/**
 * @fileoverview React hook for plugin management.
 * Provides queries and mutations for installing, configuring, and managing plugins.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  configurePlugin,
  fetchAvailablePlugins,
  fetchPlugins,
  fetchWebhookBaseUrl,
  fetchWebhookTargets,
  installPlugin,
  syncPluginMetadata,
  syncWebhookTargets,
  togglePlugin,
  uninstallPlugin,
} from '@/services/plugin.service';

/** Query key factory for plugin queries */
const pluginKeys = {
  all: ['plugins'] as const,
  lists: () => [...pluginKeys.all, 'list'] as const,
  available: () => [...pluginKeys.all, 'available'] as const,
  webhookTargets: (id: string) => [...pluginKeys.all, 'webhookTargets', id] as const,
};

/**
 * Hook to fetch all plugin instances.
 * @returns TanStack Query result with plugin list
 */
export function usePlugins() {
  return useQuery({
    queryKey: pluginKeys.lists(),
    queryFn: fetchPlugins,
  });
}

/**
 * Hook to fetch available plugin definitions from the registry.
 * @returns TanStack Query result with available plugins
 */
export function useAvailablePlugins() {
  return useQuery({
    queryKey: pluginKeys.available(),
    queryFn: fetchAvailablePlugins,
  });
}

/**
 * Hook to fetch the resolved public webhook base URL. Polls until resolved,
 * because the bundled tunnel URL becomes available a few seconds after startup.
 * @returns The webhook base URL, or null while still resolving
 */
export function useWebhookBaseUrl() {
  const { data } = useQuery({
    queryKey: [...pluginKeys.all, 'webhookBaseUrl'],
    queryFn: fetchWebhookBaseUrl,
    refetchInterval: (query) => (query.state.data ? false : 5_000),
    staleTime: 60_000,
  });
  return data ?? null;
}

/**
 * Hook to install a plugin instance.
 * @returns TanStack Mutation for plugin installation
 */
export function useInstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { pluginId: string; name: string; config?: Record<string, unknown> }) =>
      installPlugin(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
    },
  });
}

/**
 * Hook to uninstall a plugin instance.
 * @returns TanStack Mutation for plugin uninstallation
 */
export function useUninstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => uninstallPlugin(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
    },
  });
}

/**
 * Hook to enable or disable a plugin instance.
 * @returns TanStack Mutation for toggling plugin status
 */
export function useTogglePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => togglePlugin(id, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
    },
  });
}

/**
 * Hook to update a plugin instance's configuration.
 * @returns TanStack Mutation for updating plugin config
 */
export function useConfigurePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, config }: { id: string; config: Record<string, unknown> }) =>
      configurePlugin(id, config),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
    },
  });
}

/**
 * Hook to sync metadata for a plugin instance from its external API.
 * @returns TanStack Mutation for metadata sync
 */
export function useSyncPluginMetadata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => syncPluginMetadata(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pluginKeys.lists() });
    },
  });
}

/**
 * Hook to fetch the monitorable projects for a plugin instance and their
 * webhook installation status.
 * @param pluginInstanceId - The plugin instance ID (query disabled when empty)
 * @param webhookUrl - The Eventium webhook URL GitLab should call
 * @returns TanStack Query result with webhook targets
 */
export function useWebhookTargets(pluginInstanceId: string, webhookUrl: string) {
  return useQuery({
    queryKey: pluginKeys.webhookTargets(pluginInstanceId),
    queryFn: () => fetchWebhookTargets(pluginInstanceId, webhookUrl),
    enabled: Boolean(pluginInstanceId && webhookUrl),
    staleTime: 10_000,
  });
}

/**
 * Hook to register/unregister the Eventium webhook across selected projects.
 * @returns TanStack Mutation that returns the refreshed webhook targets
 */
export function useSyncWebhookTargets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pluginInstanceId,
      targetIds,
      webhookUrl,
    }: {
      pluginInstanceId: string;
      targetIds: string[];
      webhookUrl: string;
    }) => syncWebhookTargets(pluginInstanceId, targetIds, webhookUrl),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(pluginKeys.webhookTargets(variables.pluginInstanceId), data);
    },
  });
}
