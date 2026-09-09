/**
 * @fileoverview BindingPicker — builds a cross-source data binding.
 *
 * Walks the user through picking a source *instance*, an *entity*, and a *field*
 * from the live capability vocabulary, producing a `sourceType:entity.field`
 * {@link Binding}. Additional controls appear based on the target slot's shape:
 * an aggregate for `scalar` slots, an x-axis field for `series` slots, plus
 * per-entity params and optional row filters. Selection is cross-plugin: any
 * value on any block can point at any installed source.
 */
import { useMemo, useState } from 'react';
import { useSourceCapabilities } from '@/hooks/useSourceCapabilities';
import type {
  Aggregation,
  Binding,
  BindingFilter,
  BindingShape,
  CompareOp,
  EntityDescriptor,
  InstanceCapability,
} from '@/types';
import { formatFieldRef, parseFieldRef } from '@/types';

/** Props for {@link BindingPicker}. */
export interface BindingPickerProps {
  /** The binding currently attached to the value (if any). */
  binding?: Binding;
  /** The shape the target slot expects. */
  shape: BindingShape;
  /** Emits the updated binding, or `undefined` while the selection is incomplete. */
  onChange: (binding: Binding | undefined) => void;
}

/** Reduction options offered for scalar slots. */
const AGGREGATIONS: Aggregation[] = ['count', 'sum', 'avg', 'min', 'max', 'first', 'latest'];
/** Comparison operators offered for row filters. */
const COMPARE_OPS: CompareOp[] = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains'];

/** Internal, editable state — persists selection even while the ref is partial. */
interface PickerState {
  instanceId: string;
  entity: string;
  field: string;
  aggregate?: Aggregation;
  xField?: string;
  params: Record<string, string>;
  filters: BindingFilter[];
}

/** Seeds the internal state from an existing binding. */
function seedFromBinding(
  binding: Binding | undefined,
  capabilities: InstanceCapability[],
): PickerState {
  const parsed = binding ? parseFieldRef(binding.ref) : null;
  const instanceId =
    binding?.instanceId ??
    (parsed
      ? (capabilities.find((c) => c.sourceType === parsed.sourceType)?.instanceId ?? '')
      : '');
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(binding?.params ?? {})) params[k] = String(v ?? '');
  return {
    instanceId,
    entity: parsed?.entity ?? '',
    field: parsed?.field ?? '',
    aggregate: binding?.aggregate,
    xField: binding?.xField,
    params,
    filters: (binding?.filters ?? []).map((f) => ({ ...f })),
  };
}

/** A compact, theme-styled native select. */
function Select({
  value,
  onChange,
  disabled,
  placeholder,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none transition-colors focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

/**
 * Renders the binding builder for one bound value.
 * @param props - See {@link BindingPickerProps}.
 */
export function BindingPicker({ binding, shape, onChange }: BindingPickerProps) {
  const { capabilities, isLoading } = useSourceCapabilities();
  const [state, setState] = useState<PickerState>(() => seedFromBinding(binding, capabilities));

  const instance = useMemo(
    () => capabilities.find((c) => c.instanceId === state.instanceId),
    [capabilities, state.instanceId],
  );
  const entities = instance?.capabilities.entities ?? [];
  const entity: EntityDescriptor | undefined = entities.find((e) => e.key === state.entity);
  const fields = entity?.fields ?? [];
  const entityParams = entity?.params ?? [];

  /** Commit a new internal state and emit the derived binding upward. */
  const commit = (next: PickerState) => {
    setState(next);
    if (!instance || !next.instanceId || !next.entity || !next.field) {
      onChange(undefined);
      return;
    }
    const src = capabilities.find((c) => c.instanceId === next.instanceId);
    if (!src) {
      onChange(undefined);
      return;
    }
    const params: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(next.params)) {
      if (v !== '') params[k] = v;
    }
    const result: Binding = {
      ref: formatFieldRef({ sourceType: src.sourceType, entity: next.entity, field: next.field }),
      instanceId: next.instanceId,
      ...(Object.keys(params).length > 0 ? { params } : {}),
      ...(next.filters.length > 0 ? { filters: next.filters } : {}),
      ...(shape === 'scalar' && next.aggregate ? { aggregate: next.aggregate } : {}),
      ...(shape === 'series' && next.xField ? { xField: next.xField } : {}),
    };
    onChange(result);
  };

  if (isLoading) {
    return <p className="text-[11px] text-[var(--color-text-tertiary)]">Loading sources…</p>;
  }
  if (capabilities.length === 0) {
    return (
      <p className="text-[11px] text-[var(--color-text-tertiary)]">
        No enabled data sources. Install and enable a plugin first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Source instance */}
      <Select
        value={state.instanceId}
        placeholder="Select source…"
        onChange={(instanceId) =>
          commit({ ...state, instanceId, entity: '', field: '', xField: undefined })
        }
      >
        {capabilities.map((c) => (
          <option key={c.instanceId} value={c.instanceId}>
            {c.name} ({c.sourceType})
          </option>
        ))}
      </Select>

      {/* Entity */}
      <Select
        value={state.entity}
        placeholder="Select entity…"
        disabled={!instance}
        onChange={(entityKey) =>
          commit({ ...state, entity: entityKey, field: '', xField: undefined, params: {} })
        }
      >
        {entities.map((e) => (
          <option key={e.key} value={e.key}>
            {e.label}
          </option>
        ))}
      </Select>

      {/* Field */}
      <Select
        value={state.field}
        placeholder="Select field…"
        disabled={!entity}
        onChange={(fieldKey) => commit({ ...state, field: fieldKey })}
      >
        {fields.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </Select>

      {/* Aggregate (scalar slots only) */}
      {shape === 'scalar' && entity && (
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Aggregate
          </span>
          <Select
            value={state.aggregate ?? ''}
            placeholder="None (single value)"
            onChange={(v) =>
              commit({ ...state, aggregate: (v || undefined) as Aggregation | undefined })
            }
          >
            {AGGREGATIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </label>
      )}

      {/* X-axis field (series slots only) */}
      {shape === 'series' && entity && (
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            X axis field
          </span>
          <Select
            value={state.xField ?? ''}
            placeholder="Select x field…"
            onChange={(v) => commit({ ...state, xField: v || undefined })}
          >
            {fields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </Select>
        </label>
      )}

      {/* Entity params */}
      {entityParams.length > 0 && (
        <div className="space-y-1.5 rounded-md border border-[var(--color-border-primary)] p-2">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Parameters
          </span>
          {entityParams.map((p) => (
            <label key={p.key} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-[11px] text-[var(--color-text-secondary)]">
                {p.label}
                {p.required && <span className="text-red-500">*</span>}
              </span>
              <input
                type="text"
                value={state.params[p.key] ?? ''}
                onChange={(e) =>
                  commit({ ...state, params: { ...state.params, [p.key]: e.target.value } })
                }
                className="flex-1 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </label>
          ))}
        </div>
      )}

      {/* Row filters */}
      {entity && (
        <FilterEditor
          fields={fields.map((f) => ({ key: f.key, label: f.label }))}
          filters={state.filters}
          onChange={(filters) => commit({ ...state, filters })}
        />
      )}
    </div>
  );
}

/** Editor for a binding's optional row filters. */
function FilterEditor({
  fields,
  filters,
  onChange,
}: {
  fields: { key: string; label: string }[];
  filters: BindingFilter[];
  onChange: (filters: BindingFilter[]) => void;
}) {
  const addFilter = () => {
    const first = fields[0];
    if (!first) return;
    onChange([...filters, { field: first.key, op: 'eq', value: '' }]);
  };

  const update = (index: number, patch: Partial<BindingFilter>) => {
    onChange(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const remove = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Filters
        </span>
        <button
          type="button"
          onClick={addFilter}
          className="text-[10px] font-medium text-brand-500 hover:text-brand-600"
        >
          + Add
        </button>
      </div>
      {filters.map((f, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: filter rows have no stable id
        <div key={i} className="flex items-center gap-1">
          <select
            value={f.field}
            onChange={(e) => update(i, { field: e.target.value })}
            className="min-w-0 flex-1 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-1.5 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
          >
            {fields.map((fd) => (
              <option key={fd.key} value={fd.key}>
                {fd.label}
              </option>
            ))}
          </select>
          <select
            value={f.op}
            onChange={(e) => update(i, { op: e.target.value as CompareOp })}
            className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-1.5 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
          >
            {COMPARE_OPS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={String(f.value)}
            onChange={(e) => update(i, { value: e.target.value })}
            className="w-16 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-1.5 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 px-1 text-[var(--color-text-tertiary)] hover:text-red-500"
            aria-label="Remove filter"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
