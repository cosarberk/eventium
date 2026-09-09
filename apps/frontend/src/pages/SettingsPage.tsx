/**
 * @fileoverview Settings page for theme, notification rules, and general preferences.
 */

import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useNotificationRules } from '@/hooks/useNotifications';
import { useTheme } from '@/hooks/useTheme';

/**
 * Renders the settings page with sections for theme, notification rules, and about info.
 */
export function SettingsPage() {
  const { mode, toggle, isDark } = useTheme();
  const { rules, isLoading, deleteRule } = useNotificationRules();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Settings</h1>
        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
          Manage your dashboard preferences and notification rules
        </p>
      </div>

      {/* Appearance */}
      <section className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
          <h2 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
            Appearance
          </h2>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Theme</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                Current: {mode === 'dark' ? 'Dark' : 'Light'} mode
              </p>
            </div>
            <button
              onClick={toggle}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isDark ? 'bg-brand-500' : 'bg-[var(--color-border-secondary)]'
              }`}
              role="switch"
              aria-checked={isDark}
              aria-label="Toggle dark mode"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  isDark ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Notification Rules */}
      <section className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
          <h2 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
            Notification Rules
          </h2>
        </div>
        <div className="divide-y divide-[var(--color-border-primary)]">
          {isLoading ? (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              title="No notification rules"
              description="Notification rules let you control which events trigger alerts."
            />
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {rule.name}
                    </p>
                    <Badge variant={rule.enabled ? 'success' : 'neutral'}>
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1 font-mono">
                    {rule.eventPattern}
                  </p>
                </div>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-red-500 hover:bg-[var(--color-surface-hover)] transition-colors"
                  aria-label={`Delete rule: ${rule.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M2 3.5h10M5 3.5V2a1 1 0 011-1h2a1 1 0 011 1v1.5M11 3.5v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8M5.5 6v4M8.5 6v4"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* About */}
      <section className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border-primary)]">
          <h2 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
            About
          </h2>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">Application</span>
            <span className="text-xs text-[var(--color-text-primary)] font-medium">Eventium</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">Developer</span>
            <span className="text-xs text-[var(--color-text-primary)] font-medium">Relteco</span>
          </div>
        </div>
      </section>
    </div>
  );
}
