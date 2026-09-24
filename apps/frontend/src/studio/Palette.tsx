/**
 * @fileoverview Component palette — the studio's drag source.
 *
 * Groups and entries are driven by the active project type's descriptor: a
 * `dashboard` surfaces KPI/chart groups, a `site` surfaces content/media, a
 * `blank` surfaces everything. Each chip can be dragged onto the canvas (native
 * drag → react-grid-layout drop) or clicked to append. Nothing here is
 * hardcoded per type — it all reads from the project-type registry.
 */
import { useMemo, useState } from 'react';
import { getComponent, listComponentDescriptors } from '@/components/design/registry';
import { useDashboardStore } from '@/storage/dashboard.store';
import type { ComponentDescriptor } from '@/types';
import { readProjectTypeId } from './project';
import { getProjectType, type PaletteGroup } from './project-types';

/** One resolved palette group: its label plus concrete component descriptors. */
interface ResolvedGroup {
  id: string;
  label: string;
  items: ComponentDescriptor[];
}

/** Resolve a project type's palette groups into concrete descriptors. */
function resolveGroups(groups: readonly PaletteGroup[]): ResolvedGroup[] {
  const all = listComponentDescriptors();
  return groups.map((g) => ({
    id: g.id,
    label: g.label,
    // Empty `components` means "every registered component".
    items:
      g.components.length === 0
        ? all
        : g.components
            .map((type) => getComponent(type)?.descriptor)
            .filter((d): d is ComponentDescriptor => Boolean(d)),
  }));
}

/** The left palette dock (edit mode). */
export function Palette() {
  const activeDashboard = useDashboardStore((s) => s.activeDashboard);
  const addBlock = useDashboardStore((s) => s.addBlock);
  const [search, setSearch] = useState('');

  const typeId = readProjectTypeId(activeDashboard?.layout);
  const projectType = getProjectType(typeId);

  const groups = useMemo(() => {
    const resolved = resolveGroups(
      projectType?.palette ?? [{ id: 'all', label: 'Bileşenler', components: [] }],
    );
    const q = search.trim().toLowerCase();
    if (!q) return resolved;
    return resolved
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (d) => d.label.toLowerCase().includes(q) || d.type.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [projectType, search]);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-[var(--color-bg-secondary)]">
      <div className="border-b border-[var(--color-border-primary)] p-2.5">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-sm">{projectType?.icon ?? '🧱'}</span>
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">
            {projectType?.label ?? 'Bileşenler'}
          </span>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ara…"
          className="w-full rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-2.5">
        {groups.length === 0 && (
          <p className="px-1 py-4 text-center text-[11px] text-[var(--color-text-tertiary)]">
            Eşleşen bileşen yok.
          </p>
        )}
        {groups.map((group) => (
          <div key={group.id} className="space-y-1.5">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              {group.label}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {group.items.map((d) => (
                <button
                  key={d.type}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', d.type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => addBlock(d.type)}
                  title={`${d.label} — sürükle veya tıkla`}
                  className="flex cursor-grab flex-col items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-2.5 text-center transition-colors hover:border-brand-500/60 hover:bg-[var(--color-surface-hover)] active:cursor-grabbing"
                >
                  <span className="text-base leading-none">{d.icon}</span>
                  <span className="truncate text-[10px] font-medium text-[var(--color-text-secondary)]">
                    {d.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="border-t border-[var(--color-border-primary)] px-2.5 py-2 text-[10px] leading-snug text-[var(--color-text-tertiary)]">
        Tuvale <b>sürükle-bırak</b> ya da tıkla. Serbest modda istediğin yere koy.
      </p>
    </aside>
  );
}
