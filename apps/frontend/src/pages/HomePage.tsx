/**
 * @fileoverview Home — the project manager.
 *
 * The entry screen lists the user's projects (boards) as openable cards and lets
 * them create a new one. Not a marketing page: opening a project drops straight
 * into the studio workspace.
 */
import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardStore } from '@/storage/dashboard.store';
import { readProjectTypeId } from '@/studio/project';
import { getProjectType } from '@/studio/project-types';
import type { Dashboard } from '@/types';

/** Home / project manager. */
export function HomePage() {
  const navigate = useNavigate();
  const { dashboards } = useDashboard();
  const setActiveDashboard = useDashboardStore((s) => s.setActiveDashboard);
  const [q, setQ] = useState('');

  const projects = useMemo(() => {
    const list = [...(dashboards ?? [])].sort((a, b) =>
      (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
    );
    const query = q.trim().toLowerCase();
    return query ? list.filter((d) => d.name.toLowerCase().includes(query)) : list;
  }, [dashboards, q]);

  const open = (d: Dashboard) => {
    setActiveDashboard(d);
    navigate({ to: '/boards' });
  };

  return (
    <div className="mx-auto max-w-6xl px-2 py-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Projelerim</h1>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            {dashboards?.length ?? 0} proje · aç ya da yeni oluştur
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Projelerde ara…"
            className="w-48 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <button
            type="button"
            onClick={() => navigate({ to: '/new' })}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M7 2v10M2 7h10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            Yeni proje
          </button>
        </div>
      </div>

      {/* Project grid */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* New project tile */}
        <button
          type="button"
          onClick={() => navigate({ to: '/new' })}
          className="group flex min-h-[128px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border-secondary)] text-[var(--color-text-tertiary)] transition-colors hover:border-brand-500/60 hover:text-brand-500"
        >
          <span className="text-2xl">＋</span>
          <span className="text-xs font-medium">Yeni proje</span>
        </button>

        {projects.map((d) => {
          const type = getProjectType(readProjectTypeId(d.layout));
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => open(d)}
              style={
                { '--type-accent': type?.accent ?? 'var(--color-brand-500)' } as React.CSSProperties
              }
              className="group relative flex min-h-[128px] flex-col overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] p-4 pt-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--type-accent)] hover:shadow-lg"
            >
              <span
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: 'var(--type-accent)' }}
              />
              <div className="flex items-center gap-2">
                <span className="text-xl">{type?.icon ?? '📊'}</span>
                <span className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">
                  {type?.label ?? 'Proje'}
                </span>
              </div>
              <h3 className="mt-2 truncate text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-brand-500">
                {d.name}
              </h3>
              {d.description && (
                <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-text-tertiary)]">
                  {d.description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-3 text-[10px] text-[var(--color-text-tertiary)]">
                <span>{d.blocks?.length ?? 0} bileşen</span>
                {(() => {
                  const t = d.updatedAt ? new Date(d.updatedAt) : null;
                  return t && !Number.isNaN(t.getTime()) ? (
                    <span>{t.toLocaleDateString('tr-TR')}</span>
                  ) : null;
                })()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { label: 'Eklentiler', to: '/plugins' as const, icon: '🔌' },
          { label: 'Canlı / TV', to: '/live' as const, icon: '📺' },
          { label: 'Linklerim', to: '/links' as const, icon: '🔗' },
        ].map((l) => (
          <button
            key={l.to}
            type="button"
            onClick={() => navigate({ to: l.to })}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-brand-500/40 hover:text-[var(--color-text-primary)]"
          >
            <span>{l.icon}</span>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
