/**
 * @fileoverview Plugin instances list panel.
 * Displays installed plugins with their status.
 */
import { motion } from 'framer-motion';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { usePlugins } from '@/hooks/usePlugins';

/**
 * Renders a list of installed plugin instances with status badges.
 */
export function ProjectList() {
  const { data: plugins, isLoading } = usePlugins();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!plugins || plugins.length === 0) {
    return (
      <EmptyState
        title="No plugins installed"
        description="Install plugins to start monitoring your infrastructure."
        icon={
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect x="4" y="8" width="24" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
            <path
              d="M4 12h24M12 8v16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    );
  }

  return (
    <div className="divide-y divide-[var(--color-border-primary)] max-h-[500px] overflow-y-auto">
      {plugins.map((plugin, index) => (
        <motion.div
          key={plugin.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {plugin.name}
                </p>
                <Badge variant={plugin.enabled ? 'success' : 'neutral'} className="shrink-0">
                  {plugin.enabled ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                  {plugin.pluginId}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
