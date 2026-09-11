/**
 * @fileoverview Project launcher — the OnlyOffice-style start screen.
 *
 * Renders one card per registered project type (fully data-driven: adding a type
 * descriptor adds a card, no code change here). Choosing a type creates a project
 * whose type + layout mode travel in its layout blob, then opens the editor
 * focused for that type. Also lists recent projects to reopen.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useDashboard } from '@/hooks/useDashboard';
import { createDashboard } from '@/services/dashboard.service';
import { useDashboardStore } from '@/storage/dashboard.store';
import { projectLayout } from './project';
// Side-effect: registers all built-in project types into the registry.
import { listProjectTypes, type ProjectTypeDescriptor } from './project-types';

/** The launcher page. */
export function Launcher() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const types = listProjectTypes();
  const { dashboards } = useDashboard();
  const setActiveDashboard = useDashboardStore((s) => s.setActiveDashboard);
  const setEditMode = useDashboardStore((s) => s.setEditMode);
  const [busy, setBusy] = useState<string | null>(null);

  const create = async (type: ProjectTypeDescriptor) => {
    if (busy) return;
    setBusy(type.id);
    try {
      const name = `${type.label} · ${new Date().toLocaleDateString('tr-TR')}`;
      const created = await createDashboard(name, [], false, projectLayout(type.id));
      // Refresh the list first so the editor's dashboard sync keeps the new
      // project active instead of reconciling it away against a stale list.
      await queryClient.refetchQueries({ queryKey: ['dashboards'] });
      setActiveDashboard(created);
      setEditMode(true);
      navigate({ to: '/boards' });
    } catch (err) {
      toast.error(`Proje oluşturulamadı: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const featured = types.filter((t) => t.featured);
  const rest = types.filter((t) => !t.featured);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Yeni proje</h1>
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
          Ne kuracağını seç — editör o alana odaklanır, ama içeride her şey serbest.
        </p>
      </header>

      {/* Featured types — larger cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((type) => (
          <TypeCard
            key={type.id}
            type={type}
            large
            busy={busy === type.id}
            onClick={() => create(type)}
          />
        ))}
      </div>

      {/* Remaining types — compact row */}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rest.map((type) => (
            <TypeCard
              key={type.id}
              type={type}
              busy={busy === type.id}
              onClick={() => create(type)}
            />
          ))}
        </div>
      )}

      {/* Recent projects */}
      {dashboards.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Son projeler
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dashboards.slice(0, 6).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setActiveDashboard(d);
                  navigate({ to: '/boards' });
                }}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-3 py-2.5 text-left transition-colors hover:border-brand-500/50 hover:bg-[var(--color-surface-hover)]"
              >
                <span className="text-lg">📁</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">
                    {d.name}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--color-text-tertiary)]">
                    {d.blocks?.length ?? 0} bileşen
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** A single project-type card. */
function TypeCard({
  type,
  large = false,
  busy,
  onClick,
}: {
  type: ProjectTypeDescriptor;
  large?: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      style={{ '--type-accent': type.accent } as React.CSSProperties}
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] text-left transition-all hover:-translate-y-0.5 hover:border-[var(--type-accent)] hover:shadow-lg disabled:cursor-wait disabled:opacity-60 ${
        large ? 'p-5' : 'p-3.5'
      }`}
    >
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: 'var(--type-accent)' }}
      />
      <span className={`mb-2 ${large ? 'text-3xl' : 'text-2xl'}`}>{type.icon}</span>
      <span
        className={`font-semibold text-[var(--color-text-primary)] ${large ? 'text-base' : 'text-sm'}`}
      >
        {type.label}
      </span>
      {large && (
        <span className="mt-1 text-xs leading-relaxed text-[var(--color-text-tertiary)]">
          {type.description}
        </span>
      )}
      {busy && (
        <span className="mt-2 text-[11px] font-medium text-[var(--type-accent)]">
          Oluşturuluyor…
        </span>
      )}
    </button>
  );
}
