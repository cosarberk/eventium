/**
 * @fileoverview Data & Sources tool window.
 *
 * A tree of every enabled data source → entity → field, plus runtime variables.
 * Clicking a field binds it to the selected control's first slot (the same
 * `sourceType:entity.field` binding the picker builds). This is where "No data"
 * gets fixed: bind straight from the source surface.
 */
import { formatFieldRef } from '@eventium/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { getComponent } from '@/components/design/registry';
import { VariableBar } from '@/components/design/VariableBar';
import { useSourceCapabilities } from '@/hooks/useSourceCapabilities';
import { useDashboardStore } from '@/storage/dashboard.store';
import { PanelEmpty } from './PanelEmpty';

function makeValueId(): string {
  return `v-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** The Data & Sources panel. */
export function DataSourcesPanel() {
  const { capabilities, isLoading } = useSourceCapabilities();
  const activeDashboard = useDashboardStore((s) => s.activeDashboard);
  const selectedId = useDashboardStore((s) => s.selectedBlockId);
  const updateBlockSlots = useDashboardStore((s) => s.updateBlockSlots);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /** Bind a field to the selected control's first slot. */
  const bindField = (
    sourceType: string,
    instanceId: string,
    entity: string,
    field: string,
    label: string,
  ) => {
    const block = activeDashboard?.blocks.find((b) => b.id === selectedId);
    if (!block) {
      toast.error('Önce tuvalde bir bileşen seç.');
      return;
    }
    const slotKey = getComponent(block.componentType)?.descriptor?.slots[0]?.key;
    if (!slotKey) {
      toast.error('Bu bileşenin bağlanabilir bir slotu yok.');
      return;
    }
    const existing = block.slots[slotKey]?.values ?? [];
    const value = {
      id: makeValueId(),
      binding: { ref: formatFieldRef({ sourceType, entity, field }), instanceId },
      label,
    };
    updateBlockSlots(block.id, { ...block.slots, [slotKey]: { values: [...existing, value] } });
    toast.success(`${label} bağlandı`);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-secondary)]">
      <div className="min-h-0 flex-1 overflow-auto p-1.5 text-xs">
        {isLoading && <p className="px-2 py-3 text-[var(--color-text-tertiary)]">Yükleniyor…</p>}
        {!isLoading && capabilities.length === 0 && (
          <PanelEmpty
            icon="🔌"
            text="Etkin kaynak yok. Eklentiler'den bir veri kaynağı bağla; alanları buradan sürükle."
          />
        )}

        {capabilities.map((inst) => {
          const instOpen = expanded.has(inst.instanceId);
          return (
            <div key={inst.instanceId}>
              <Row
                depth={0}
                open={instOpen}
                caret
                icon="🔌"
                label={inst.name}
                hint={inst.sourceType}
                onClick={() => toggle(inst.instanceId)}
              />
              {instOpen &&
                inst.capabilities.entities.map((entity) => {
                  const eid = `${inst.instanceId}:${entity.key}`;
                  const entOpen = expanded.has(eid);
                  return (
                    <div key={eid}>
                      <Row
                        depth={1}
                        open={entOpen}
                        caret
                        icon="▤"
                        label={entity.label}
                        onClick={() => toggle(eid)}
                      />
                      {entOpen &&
                        entity.fields.map((field) => (
                          <Row
                            key={field.key}
                            depth={2}
                            icon="•"
                            label={field.label}
                            hint={String(field.type)}
                            draggable
                            dragData={{
                              sourceType: inst.sourceType,
                              instanceId: inst.instanceId,
                              entity: entity.key,
                              field: field.key,
                              label: field.label,
                            }}
                            onClick={() =>
                              bindField(
                                inst.sourceType,
                                inst.instanceId,
                                entity.key,
                                field.key,
                                field.label,
                              )
                            }
                          />
                        ))}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--color-border-primary)] p-2">
        <VariableBar />
      </div>
    </div>
  );
}

/** One tree row. */
function Row({
  depth,
  open,
  caret,
  icon,
  label,
  hint,
  onClick,
  draggable,
  dragData,
}: {
  depth: number;
  open?: boolean;
  caret?: boolean;
  icon: string;
  label: string;
  hint?: string;
  onClick: () => void;
  draggable?: boolean;
  dragData?: Record<string, string>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={
        draggable && dragData
          ? (e) => {
              e.dataTransfer.setData('application/eventium-field', JSON.stringify(dragData));
              e.dataTransfer.effectAllowed = 'copy';
            }
          : undefined
      }
      style={{ paddingLeft: 6 + depth * 14 }}
      className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      title={depth === 2 ? 'Bileşene sürükle ya da tıkla (seçili bileşene bağla)' : undefined}
    >
      <span className="w-3 shrink-0 text-center text-[9px] text-[var(--color-text-tertiary)]">
        {caret ? (open ? '▾' : '▸') : ''}
      </span>
      <span className="w-4 shrink-0 text-center text-[11px] leading-none">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && (
        <span className="shrink-0 font-mono text-[9px] text-[var(--color-text-tertiary)]">
          {hint}
        </span>
      )}
    </button>
  );
}
