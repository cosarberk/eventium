/**
 * @fileoverview Plugin marketplace page — inspired by VSCode extension marketplace.
 * Two tabs: "Marketplace" (available plugins from registry) and "Installed" (active instances).
 * Marketplace: browse, view details, install with config form.
 * Installed: view webhook URL, edit config, toggle, uninstall, send test event.
 */

import { INTERNAL_CONFIG_PREFIX, SECRET_MASK } from '@eventium/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PluginIcon } from '@/components/common/PluginIcon';
import { SeverityIndicator } from '@/components/common/SeverityIndicator';
import { config as appConfig } from '@/config';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useAvailablePlugins,
  useConfigurePlugin,
  useInstallPlugin,
  usePlugins,
  useSyncPluginMetadata,
  useSyncWebhookTargets,
  useTogglePlugin,
  useUninstallPlugin,
  useWebhookBaseUrl,
  useWebhookTargets,
} from '@/hooks/usePlugins';
import type { AvailablePlugin, Plugin, Severity, WebhookTarget } from '@/types';

type Tab = 'marketplace' | 'installed';

/**
 * Plugin marketplace page component.
 */
export function PluginsPage() {
  const { data: installedPlugins, isLoading: loadingInstalled } = usePlugins();
  const { data: availablePlugins, isLoading: loadingAvailable } = useAvailablePlugins();
  const installMutation = useInstallPlugin();
  const uninstallMutation = useUninstallPlugin();
  const toggleMutation = useTogglePlugin();
  const configureMutation = useConfigurePlugin();
  const syncMetadataMutation = useSyncPluginMetadata();
  const webhookBaseUrl = useWebhookBaseUrl();
  // Installing and configuring a source means handling its credentials, so the
  // server restricts those mutations to ADMIN.
  const { canManageSources } = usePermissions();

  const [tab, setTab] = useState<Tab>('marketplace');
  const [installModal, setInstallModal] = useState<AvailablePlugin | null>(null);
  const [configEditPlugin, setConfigEditPlugin] = useState<Plugin | null>(null);
  const [projectsPlugin, setProjectsPlugin] = useState<Plugin | null>(null);

  const installed = installedPlugins ?? [];
  const available = availablePlugins ?? [];
  const isLoading = loadingInstalled || loadingAvailable;

  /** Get the registry definition for an installed instance */
  const getDefinition = useCallback(
    (pluginId: string) => available.find((p) => p.id === pluginId),
    [available],
  );

  /**
   * Generates the webhook URL for a plugin. Prefers the server-resolved public
   * base URL (a tunnel or configured domain reachable from GitLab/Nexus) and
   * falls back to the current origin until it resolves.
   */
  const getWebhookUrl = (pluginId: string) => {
    const base = webhookBaseUrl ?? window.location.origin;
    return `${base}/api/webhooks/${pluginId}`;
  };

  /** Send a test webhook event */
  const sendTestEvent = async (pluginId: string) => {
    try {
      const res = await fetch(`${appConfig.apiBaseUrl}/webhooks/${pluginId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gitlab-Event': 'Push Hook',
        },
        credentials: 'include',
        body: JSON.stringify({
          ref: 'refs/heads/main',
          user_username: 'test-user',
          total_commits_count: 1,
          commits: [{ message: 'Test commit from Eventium', timestamp: new Date().toISOString() }],
        }),
      });
      if (res.ok) {
        toast.success('Test event sent — check your dashboard');
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error((body as { error?: string }).error ?? 'Failed to send test event');
      }
    } catch {
      toast.error('Failed to send test event');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Plugins</h1>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
          Browse, install, and manage event source integrations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-bg-tertiary)] w-fit">
        {[
          { id: 'marketplace' as Tab, label: 'Marketplace', count: available.length },
          { id: 'installed' as Tab, label: 'Installed', count: installed.length },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
              tab === t.id
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {t.label}
            <span
              className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 ${
                tab === t.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-[var(--color-border-primary)] text-[var(--color-text-tertiary)]'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {tab === 'marketplace' ? (
          <motion.div
            key="marketplace"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-4"
          >
            {available.length === 0 ? (
              <EmptyState title="No plugins available" description="Plugin registry is empty." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {available.map((plugin) => {
                  const isInstalled = installed.some((i) => i.pluginId === plugin.id);
                  return (
                    <motion.div
                      key={plugin.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-sm overflow-hidden hover:border-brand-500/50 transition-colors"
                    >
                      <div className="p-4 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center shrink-0 [&>span>svg]:w-6 [&>span>svg]:h-6">
                            <PluginIcon icon={plugin.icon} name={plugin.name} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                              {plugin.name}
                            </h3>
                            <p className="text-[10px] text-[var(--color-text-tertiary)]">
                              v{plugin.version} — {plugin.author}
                            </p>
                          </div>
                          {isInstalled && <Badge variant="success">Installed</Badge>}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-3 line-clamp-2">
                          {plugin.description}
                        </p>

                        {/* Streamed event types (from the source's capabilities) */}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {plugin.capabilities.events.slice(0, 4).map((et) => (
                            <span
                              key={et.type}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]"
                            >
                              <SeverityIndicator
                                severity={et.defaultSeverity as Severity}
                                showLabel={false}
                                size="sm"
                              />
                              {et.label}
                            </span>
                          ))}
                          {plugin.capabilities.events.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]">
                              +{plugin.capabilities.events.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="px-4 py-3 border-t border-[var(--color-border-primary)] flex justify-end">
                        <button
                          type="button"
                          onClick={() => setInstallModal(plugin)}
                          disabled={isInstalled || !canManageSources}
                          title={canManageSources ? undefined : 'Requires the ADMIN role'}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                          {isInstalled ? 'Installed' : 'Install'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="installed"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-4"
          >
            {installed.length === 0 ? (
              <EmptyState
                title="No plugins installed"
                description="Go to the Marketplace tab to browse and install plugins."
              />
            ) : (
              <div className="space-y-3">
                {installed.map((plugin) => {
                  const def = getDefinition(plugin.pluginId);
                  const webhookUrl = getWebhookUrl(plugin.pluginId);

                  return (
                    <motion.div
                      key={plugin.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-sm overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center shrink-0 [&>span>svg]:w-6 [&>span>svg]:h-6">
                              <PluginIcon icon={def?.icon} name={plugin.name} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                                  {plugin.name}
                                </h3>
                                <Badge variant={plugin.enabled ? 'success' : 'neutral'}>
                                  {plugin.enabled ? 'Active' : 'Disabled'}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                                {plugin.pluginId} — {def?.version ?? 'unknown'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                syncMetadataMutation.mutate(plugin.id, {
                                  onSuccess: () => toast.success('Metadata synced'),
                                  onError: () => toast.error('Sync failed'),
                                })
                              }
                              disabled={syncMetadataMutation.isPending}
                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 transition-colors disabled:opacity-50"
                              title="Sync metadata from external API"
                            >
                              {syncMetadataMutation.isPending ? 'Syncing...' : 'Sync'}
                            </button>
                            <button
                              type="button"
                              onClick={() => sendTestEvent(plugin.pluginId)}
                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
                              title="Send a test webhook event"
                            >
                              Test
                            </button>
                            <button
                              type="button"
                              onClick={() => setProjectsPlugin(plugin)}
                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900/30 dark:text-brand-400 transition-colors"
                              title="Choose which projects to monitor (auto-creates webhooks)"
                            >
                              Projects
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfigEditPlugin(plugin)}
                              disabled={!canManageSources}
                              title={canManageSources ? undefined : 'Requires the ADMIN role'}
                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Config
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                toggleMutation.mutate(
                                  { id: plugin.id, enabled: !plugin.enabled },
                                  {
                                    onSuccess: () =>
                                      toast.success(plugin.enabled ? 'Disabled' : 'Enabled'),
                                  },
                                )
                              }
                              disabled={!canManageSources}
                              title={canManageSources ? undefined : 'Requires the ADMIN role'}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                plugin.enabled
                                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                              }`}
                            >
                              {plugin.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!window.confirm(`Uninstall "${plugin.name}"?`)) return;
                                uninstallMutation.mutate(plugin.id, {
                                  onSuccess: () => toast.success('Uninstalled'),
                                });
                              }}
                              disabled={!canManageSources}
                              title={canManageSources ? undefined : 'Requires the ADMIN role'}
                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Uninstall
                            </button>
                          </div>
                        </div>

                        {/* Webhook URL */}
                        <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)]">
                          <span className="text-[10px] font-medium text-[var(--color-text-tertiary)] shrink-0 uppercase tracking-wider">
                            Webhook
                          </span>
                          <code className="text-[11px] text-[var(--color-text-secondary)] font-mono truncate flex-1">
                            {webhookUrl}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(webhookUrl);
                              toast.success('Webhook URL copied');
                            }}
                            className="shrink-0 px-2 py-1 rounded text-[10px] font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                          >
                            Copy
                          </button>
                        </div>

                        {/* Public reachability hint */}
                        <p className="mt-1.5 text-[10px] text-[var(--color-text-tertiary)]">
                          {webhookBaseUrl ? (
                            <>
                              <span className="text-emerald-500">●</span> Public URL ready —
                              reachable by your GitLab/Nexus.
                            </>
                          ) : (
                            <>
                              <span className="text-amber-500">●</span> Resolving public URL… until
                              ready, this address only works if GitLab runs on this machine. Set
                              <code className="font-mono"> PUBLIC_URL</code> for your own domain.
                            </>
                          )}
                        </p>

                        {/* Metadata Summary */}
                        {plugin.syncedAt &&
                          (() => {
                            const meta = plugin.metadata as Record<string, unknown> | null;
                            const projectCount = (meta?.projectCount as number) ?? 0;
                            const webhookEvents = (meta?.webhookEvents as string[]) ?? [];
                            return (
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--color-text-tertiary)]">
                                {projectCount > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)]">
                                    {projectCount} projects
                                  </span>
                                )}
                                {webhookEvents.length > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)]">
                                    {webhookEvents.length} active events
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded bg-[var(--color-bg-tertiary)]">
                                  synced {new Date(plugin.syncedAt).toLocaleString()}
                                </span>
                              </div>
                            );
                          })()}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install Modal */}
      <AnimatePresence>
        {installModal && (
          <InstallPluginModal
            plugin={installModal}
            isInstalling={installMutation.isPending}
            onClose={() => setInstallModal(null)}
            onInstall={(name, pluginConfig) => {
              installMutation.mutate(
                { pluginId: installModal.id, name, config: pluginConfig },
                {
                  onSuccess: () => {
                    toast.success(`${name} installed`);
                    setInstallModal(null);
                    setTab('installed');
                  },
                  onError: () => toast.error('Install failed'),
                },
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* Monitored Projects Modal */}
      <AnimatePresence>
        {projectsPlugin && (
          <ProjectsModal
            plugin={projectsPlugin}
            webhookUrl={getWebhookUrl(projectsPlugin.pluginId)}
            onClose={() => setProjectsPlugin(null)}
          />
        )}
      </AnimatePresence>

      {/* Config Edit Modal */}
      <AnimatePresence>
        {configEditPlugin && (
          <ConfigEditModal
            plugin={configEditPlugin}
            definition={getDefinition(configEditPlugin.pluginId)}
            isSaving={configureMutation.isPending}
            onClose={() => setConfigEditPlugin(null)}
            onSave={(newConfig) => {
              configureMutation.mutate(
                { id: configEditPlugin.id, config: newConfig },
                {
                  onSuccess: () => {
                    toast.success('Configuration updated');
                    setConfigEditPlugin(null);
                  },
                  onError: () => toast.error('Failed to update config'),
                },
              );
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Install Modal ─────────────────────────────────────────────────────── */

interface InstallPluginModalProps {
  plugin: AvailablePlugin;
  isInstalling: boolean;
  onClose: () => void;
  onInstall: (name: string, config: Record<string, unknown>) => void;
}

function InstallPluginModal({ plugin, isInstalling, onClose, onInstall }: InstallPluginModalProps) {
  const [name, setName] = useState(`${plugin.name}`);
  const [formConfig, setFormConfig] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of plugin.configFields) {
      initial[field.key] = field.defaultValue ?? '';
    }
    return initial;
  });

  const canSubmit =
    name.trim().length > 0 &&
    plugin.configFields.filter((f) => f.required).every((f) => formConfig[f.key]?.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md mx-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-xl"
      >
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center [&>span>svg]:w-6 [&>span>svg]:h-6">
              <PluginIcon icon={plugin.icon} name={plugin.name} fallbackClassName="font-bold" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Install {plugin.name}
              </h2>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">
                v{plugin.version} by {plugin.author}
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                Instance Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
              />
            </div>
            {plugin.configFields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {field.description && (
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">
                    {field.description}
                  </p>
                )}
                <input
                  type={
                    field.key.includes('secret') || field.key.includes('token')
                      ? 'password'
                      : 'text'
                  }
                  value={formConfig[field.key] ?? ''}
                  onChange={(e) => setFormConfig((p) => ({ ...p, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-border-primary)] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => canSubmit && onInstall(name.trim(), formConfig)}
            disabled={!canSubmit || isInstalling}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Config Edit Modal ─────────────────────────────────────────────────── */

interface ConfigEditModalProps {
  plugin: Plugin;
  definition?: AvailablePlugin;
  isSaving: boolean;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
}

function ConfigEditModal({ plugin, definition, isSaving, onClose, onSave }: ConfigEditModalProps) {
  const currentConfig = plugin.config as Record<string, string>;
  const [formConfig, setFormConfig] = useState<Record<string, string>>({ ...currentConfig });
  const fields = definition?.configFields ?? [];

  /** Stored secrets arrive masked; submitting the mask unchanged keeps them. */
  const hasStoredSecret = Object.values(currentConfig).some((v) => v === SECRET_MASK);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md mx-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-xl"
      >
        <div className="p-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Configure {plugin.name}
          </h2>
          {hasStoredSecret && (
            <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">
              Stored credentials are hidden. Leave a masked field untouched to keep it, or clear it
              and type a new value to replace it.
            </p>
          )}
          <div className="mt-4 space-y-3.5">
            {fields.length > 0 ? (
              fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label
                    htmlFor={`config-${field.key}`}
                    className="block text-xs font-medium text-[var(--color-text-secondary)]"
                  >
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <input
                    id={`config-${field.key}`}
                    // Trust the manifest's declared type rather than guessing
                    // from the key name.
                    type={field.type === 'secret' ? 'password' : 'text'}
                    value={formConfig[field.key] ?? ''}
                    onChange={(e) => setFormConfig((p) => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
                  />
                </div>
              ))
            ) : (
              <div className="space-y-2">
                {Object.entries(formConfig)
                  // Platform-managed keys (e.g. the monitored-target list) are
                  // not user configuration.
                  .filter(([key]) => !key.startsWith(INTERNAL_CONFIG_PREFIX))
                  .map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <label
                        htmlFor={`config-raw-${key}`}
                        className="block text-xs font-medium text-[var(--color-text-secondary)] font-mono"
                      >
                        {key}
                      </label>
                      <input
                        id={`config-raw-${key}`}
                        type={value === SECRET_MASK ? 'password' : 'text'}
                        value={value}
                        onChange={(e) => setFormConfig((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-[var(--color-border-primary)] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(formConfig)}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Monitored Projects Modal ──────────────────────────────────────────── */

interface ProjectsModalProps {
  plugin: Plugin;
  webhookUrl: string;
  onClose: () => void;
}

/**
 * Lets the user pick which projects to monitor. Toggling a project and saving
 * auto-creates/removes the Eventium webhook on the corresponding repository via
 * the plugin's API — no need to open each project's settings in GitLab.
 */
function ProjectsModal({ plugin, webhookUrl, onClose }: ProjectsModalProps) {
  const { data: targets, isLoading, isError, error } = useWebhookTargets(plugin.id, webhookUrl);
  const syncMutation = useSyncWebhookTargets();

  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [search, setSearch] = useState('');

  // Initialize the selection from the server's monitored flags once loaded.
  const initialKey = targets?.map((t: WebhookTarget) => `${t.id}:${t.monitored}`).join(',');
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-seed only when the target set changes
  useEffect(() => {
    if (targets) {
      setSelected(new Set(targets.filter((t) => t.monitored).map((t) => t.id)));
    }
  }, [initialKey]);

  const list = (targets ?? []).filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.fullPath.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (targetId: string) => {
    setSelected((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(targetId)) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });
  };

  const setAll = (on: boolean) => {
    setSelected(on ? new Set((targets ?? []).map((t) => t.id)) : new Set());
  };

  const save = () => {
    if (!selected) return;
    syncMutation.mutate(
      { pluginInstanceId: plugin.id, targetIds: [...selected], webhookUrl },
      {
        onSuccess: (data) => {
          toast.success(`Monitoring ${data.filter((t) => t.monitored).length} project(s)`);
          onClose();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update webhooks'),
      },
    );
  };

  const selectedCount = selected?.size ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg mx-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-xl flex flex-col max-h-[80vh]"
      >
        <div className="p-5 border-b border-[var(--color-border-primary)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Monitored Projects — {plugin.name}
          </h2>
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">
            Toggle a project on to automatically install the Eventium webhook on it. No need to
            visit each project's settings in GitLab.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : isError ? (
          <div className="p-6 text-center">
            <p className="text-sm font-medium text-red-500">Couldn't load projects</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-3">
              Make sure the access token has the <code className="font-mono">api</code> scope and
              the plugin metadata has been synced.
            </p>
          </div>
        ) : (
          <>
            <div className="px-5 pt-3 flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => setAll(true)}
                className="px-2.5 py-2 rounded-lg text-[10px] font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setAll(false)}
                className="px-2.5 py-2 rounded-lg text-[10px] font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                None
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {list.length === 0 ? (
                <p className="text-xs text-[var(--color-text-tertiary)] text-center py-8">
                  No projects found. Sync the plugin metadata first.
                </p>
              ) : (
                list.map((t) => {
                  const on = selected?.has(t.id) ?? false;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggle(t.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-[var(--color-surface-hover)] transition-colors"
                    >
                      <span
                        className={`relative w-8 h-[18px] rounded-full shrink-0 transition-colors ${
                          on ? 'bg-brand-500' : 'bg-[var(--color-border-primary)]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${
                            on ? 'left-[15px]' : 'left-0.5'
                          }`}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[var(--color-text-primary)] truncate">
                          {t.name}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-tertiary)] font-mono truncate">
                          {t.fullPath}
                        </p>
                      </div>
                      {t.monitored && (
                        <Badge variant="success" className="shrink-0">
                          Live
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        <div className="px-5 py-3 border-t border-[var(--color-border-primary)] flex items-center justify-between gap-2">
          <span className="text-[11px] text-[var(--color-text-tertiary)]">
            {selectedCount} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={syncMutation.isPending || isLoading || isError || selected === null}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {syncMutation.isPending ? 'Applying...' : 'Apply & Install Webhooks'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
