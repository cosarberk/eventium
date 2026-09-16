/**
 * @fileoverview Studio start screen — the desktop-IDE landing.
 *
 * Not a marketing page and not a mode toggle: this is where the app opens, like
 * the Visual Studio / Blender start page. It lists the user's projects and lets
 * them open one (into the editor) or create a new one. No Import/Export/Düzenle
 * chrome here — those belong inside an open project. Opening a project drops
 * straight into the full-screen studio workspace.
 */
import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useProjects } from '@/hooks/useProjects';
import { useDashboardStore } from '@/storage/dashboard.store';
import type { Project } from '@/types';
import { getProjectType } from './project-types';

/** The studio start screen. */
export function StartScreen() {
  const navigate = useNavigate();
  const { projects: allProjects, isLoading } = useProjects();
  const openProject = useDashboardStore((s) => s.openProject);
  const [q, setQ] = useState('');

  const projects = useMemo(() => {
    const list = [...(allProjects ?? [])].sort((a, b) =>
      (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
    );
    const query = q.trim().toLowerCase();
    return query ? list.filter((d) => d.name.toLowerCase().includes(query)) : list;
  }, [allProjects, q]);

  const open = (p: Project) => openProject(p);

  return (
    <div className="h-full w-full overflow-auto bg-[var(--color-bg-primary)]">
      <div className="mx-auto grid min-h-full max-w-6xl grid-cols-1 gap-10 px-8 py-12 lg:grid-cols-[300px_1fr]">
        {/* Left rail — identity + primary actions */}
        <aside className="flex flex-col gap-8">
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-500/25">
                <span className="text-sm font-black text-white">E</span>
              </div>
              <div>
                <div className="text-[15px] font-bold leading-tight text-[var(--color-text-primary)]">
                  Eventium Studio
                </div>
                <div className="text-[11px] text-[var(--color-text-tertiary)]">
                  v0.1 · çalışma alanı
                </div>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
              Bir proje aç ya da sıfırdan başla. Her proje kendi dünyası — sayfaları, verisi,
              mantığı ve tasarımı.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: '/new' })}
              className="group flex items-center gap-3 rounded-xl bg-brand-500 px-4 py-3 text-left text-white shadow-md shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 3v10M3 8h10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>
                <span className="block text-sm font-semibold">Yeni proje</span>
                <span className="block text-[11px] text-white/70">Bir tür seç, başla</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('start-project-search');
                el?.focus();
              }}
              className="group flex items-center gap-3 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-4 py-3 text-left transition-all hover:border-brand-500/50 hover:bg-[var(--color-surface-hover)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M2 5.5A1.5 1.5 0 013.5 4h3l1.5 1.5h4.5A1.5 1.5 0 0114 7v4.5A1.5 1.5 0 0112.5 13h-9A1.5 1.5 0 012 11.5v-6z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--color-text-primary)]">
                  Proje aç
                </span>
                <span className="block text-[11px] text-[var(--color-text-tertiary)]">
                  Mevcut projelerden birini seç
                </span>
              </span>
            </button>
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {[
              { label: 'Eklentiler', to: '/plugins' as const },
              { label: 'Canlı / TV', to: '/live' as const },
              { label: 'Linklerim', to: '/links' as const },
            ].map((l) => (
              <button
                key={l.to}
                type="button"
                onClick={() => navigate({ to: l.to })}
                className="rounded-lg border border-[var(--color-border-primary)] px-2.5 py-1 text-[11px] text-[var(--color-text-secondary)] transition-colors hover:border-brand-500/40 hover:text-[var(--color-text-primary)]"
              >
                {l.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Right — projects */}
        <section className="flex min-w-0 flex-col">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Projelerim{' '}
              <span className="ml-1 font-normal normal-case text-[var(--color-text-tertiary)]/70">
                {allProjects?.length ?? 0}
              </span>
            </h2>
            <input
              id="start-project-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Projelerde ara…"
              className="w-52 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] outline-none transition-colors focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/25"
            />
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size={32} />
            </div>
          ) : projects.length === 0 ? (
            <EmptyProjects
              hasAny={(allProjects?.length ?? 0) > 0}
              onNew={() => navigate({ to: '/new' })}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((d) => {
                const type = getProjectType(d.type);
                const updated = d.updatedAt ? new Date(d.updatedAt) : null;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => open(d)}
                    style={
                      {
                        '--type-accent': type?.accent ?? 'var(--color-brand-500)',
                      } as React.CSSProperties
                    }
                    className="group relative flex min-h-[132px] flex-col overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] p-4 pt-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--type-accent)] hover:shadow-lg"
                  >
                    <span
                      className="absolute inset-x-0 top-0 h-1 opacity-80 transition-opacity group-hover:opacity-100"
                      style={{ backgroundColor: 'var(--type-accent)' }}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{type?.icon ?? '📊'}</span>
                      <span className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">
                        {type?.label ?? 'Proje'}
                      </span>
                    </div>
                    <h3 className="mt-2.5 truncate text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--type-accent)]">
                      {d.name}
                    </h3>
                    {d.description && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-text-tertiary)]">
                        {d.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-3 text-[10px] text-[var(--color-text-tertiary)]">
                      <span>{d.pages?.length ?? 0} sayfa</span>
                      {updated && !Number.isNaN(updated.getTime()) && (
                        <span>{updated.toLocaleDateString('tr-TR')}</span>
                      )}
                    </div>
                    <span className="pointer-events-none absolute bottom-3 right-3 text-[10px] font-semibold text-[var(--type-accent)] opacity-0 transition-opacity group-hover:opacity-100">
                      Aç →
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/** Empty state for the project list. */
function EmptyProjects({ hasAny, onNew }: { hasAny: boolean; onNew: () => void }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-border-secondary)] text-center">
      <span className="text-3xl opacity-60">🗂️</span>
      <p className="text-sm text-[var(--color-text-secondary)]">
        {hasAny ? 'Aramanla eşleşen proje yok.' : 'Henüz projen yok.'}
      </p>
      {!hasAny && (
        <button
          type="button"
          onClick={onNew}
          className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
        >
          İlk projeni oluştur
        </button>
      )}
    </div>
  );
}
