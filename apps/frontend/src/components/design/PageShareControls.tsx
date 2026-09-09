/**
 * @fileoverview Export/import controls for a design-layer page.
 *
 * Export downloads the active page as a portable `<name>.eventium.json`
 * ({@link PageSpec}) — instance-agnostic and safe to share. Import reads such a
 * file, prompts the user to map every source *type* the spec requires to a
 * locally installed plugin instance, and re-materializes it as a new page.
 *
 * Bindings are plugin-type bound: a spec that references `gitlab` can only be
 * imported once a `gitlab` instance exists locally to map it onto.
 */

import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { usePlugins } from '@/hooks/usePlugins';
import { exportPage, importPage, type SourceMapping } from '@/services/portability.service';
import { useDashboardStore } from '@/storage/dashboard.store';
import type { Dashboard, PageSpec, Plugin } from '@/types';

/** Props for {@link PageShareControls}. */
interface PageShareControlsProps {
  /** The id of the page to export. */
  dashboardId: string;
}

/** Turns a page name into a safe, lowercase file stem. */
function toFileStem(name: string): string {
  const stem = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return stem || 'page';
}

/**
 * Narrows an arbitrary parsed JSON value to a {@link PageSpec}. Only checks the
 * structural invariants the importer relies on; the backend performs the
 * authoritative validation.
 */
function isPageSpec(value: unknown): value is PageSpec {
  if (typeof value !== 'object' || value === null) return false;
  const spec = value as Record<string, unknown>;
  return (
    spec.specVersion === 1 &&
    typeof spec.name === 'string' &&
    Array.isArray(spec.blocks) &&
    Array.isArray(spec.requiredSources)
  );
}

/** Export + import buttons for the active page, with the import mapping modal. */
export function PageShareControls({ dashboardId }: PageShareControlsProps) {
  const { data: plugins } = usePlugins();
  const queryClient = useQueryClient();
  const setActiveDashboard = useDashboardStore((s) => s.setActiveDashboard);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingSpec, setPendingSpec] = useState<PageSpec | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  /** Exports the active page and triggers a browser download. */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const spec = await exportPage(dashboardId);
      const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${toFileStem(spec.name)}.eventium.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported "${spec.name}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  /** Runs the actual import mutation and navigates to the created page. */
  const runImport = async (spec: PageSpec, mapping: SourceMapping) => {
    setIsImporting(true);
    try {
      const created = await importPage(spec, mapping);
      await queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      const list = queryClient.getQueryData<Dashboard[]>(['dashboards', 'list']);
      const dashboard = list?.find((d) => d.id === created.id);
      if (dashboard) setActiveDashboard(dashboard);
      setPendingSpec(null);
      toast.success(`Imported "${created.name}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  /** Parses the chosen file; imports directly or opens the mapping modal. */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so selecting the same file again re-fires the change event.
    event.target.value = '';
    if (!file) return;

    let spec: unknown;
    try {
      spec = JSON.parse(await file.text());
    } catch {
      toast.error('Invalid file — not valid JSON');
      return;
    }
    if (!isPageSpec(spec)) {
      toast.error('Invalid file — not an Eventium page export');
      return;
    }

    if (spec.requiredSources.length === 0) {
      await runImport(spec, {});
    } else {
      setPendingSpec(spec);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        title="Export this page to a shareable file"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M6 8V1M6 1L3.5 3.5M6 1l2.5 2.5M2 8.5v1a1 1 0 001 1h6a1 1 0 001-1v-1"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {isExporting ? 'Exporting...' : 'Export'}
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        title="Import a page from a shareable file"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M6 1v7M6 8L3.5 5.5M6 8l2.5-2.5M2 8.5v1a1 1 0 001 1h6a1 1 0 001-1v-1"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Import
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence>
        {pendingSpec && (
          <ImportMappingModal
            spec={pendingSpec}
            plugins={plugins ?? []}
            isImporting={isImporting}
            onClose={() => setPendingSpec(null)}
            onImport={(mapping) => void runImport(pendingSpec, mapping)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Import mapping modal ───────────────────────────────────────────────── */

interface ImportMappingModalProps {
  spec: PageSpec;
  plugins: Plugin[];
  isImporting: boolean;
  onClose: () => void;
  onImport: (mapping: SourceMapping) => void;
}

/**
 * Prompts the user to bind every source type the spec requires to a locally
 * installed instance of the matching plugin. Import is blocked until every
 * required type has a selection (which is impossible when no instance of that
 * plugin type is installed).
 */
function ImportMappingModal({
  spec,
  plugins,
  isImporting,
  onClose,
  onImport,
}: ImportMappingModalProps) {
  /** Installed instances grouped by their plugin type (`pluginId`). */
  const instancesByType = useMemo(() => {
    const map = new Map<string, Plugin[]>();
    for (const plugin of plugins) {
      const existing = map.get(plugin.pluginId);
      if (existing) {
        existing.push(plugin);
      } else {
        map.set(plugin.pluginId, [plugin]);
      }
    }
    return map;
  }, [plugins]);

  // Seed each source type with its first available instance (if any).
  const [mapping, setMapping] = useState<SourceMapping>(() => {
    const initial: SourceMapping = {};
    for (const sourceType of spec.requiredSources) {
      const first = instancesByType.get(sourceType)?.[0];
      if (first) initial[sourceType] = first.id;
    }
    return initial;
  });

  const allMapped = spec.requiredSources.every((type) => Boolean(mapping[type]));

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
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md mx-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-xl"
      >
        <div className="p-5 border-b border-[var(--color-border-primary)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Import "{spec.name}"
          </h2>
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
            Map each data source this page uses to one of your installed instances.
          </p>
        </div>

        <div className="p-5 space-y-3.5 max-h-[50vh] overflow-y-auto">
          {spec.requiredSources.map((sourceType) => {
            const instances = instancesByType.get(sourceType) ?? [];
            const hasInstances = instances.length > 0;
            return (
              <div key={sourceType} className="space-y-1">
                <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                  <span className="font-mono">{sourceType}</span>
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                {hasInstances ? (
                  <select
                    value={mapping[sourceType] ?? ''}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [sourceType]: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
                  >
                    {instances.map((instance) => (
                      <option key={instance.id} value={instance.id}>
                        {instance.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="px-3 py-2 rounded-lg text-[11px] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400">
                    No <span className="font-mono">{sourceType}</span> instance installed. Install
                    one from the Plugins page before importing.
                  </p>
                )}
              </div>
            );
          })}
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
            onClick={() => allMapped && onImport(mapping)}
            disabled={!allMapped || isImporting}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
