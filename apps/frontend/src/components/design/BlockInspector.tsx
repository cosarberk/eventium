/**
 * @fileoverview BlockInspector — edits the selected block's bindings and options.
 *
 * For each slot the component declares, the user attaches one or more
 * {@link BoundValue}s. Every bound value pairs a {@link BindingPicker} with its
 * presentation: a label, ordered conditional color rules ("under 40 turns red"),
 * and a value format. The inspector also edits the component's static options and
 * the block title. It is component-agnostic — everything is driven by the
 * descriptor from the registry.
 */
import { getComponent } from '@/components/design/registry';
import type {
  BlockSlot,
  BoundValue,
  ColorRule,
  CompareOp,
  ComponentOption,
  DashboardBlock,
  PanelSeverity,
  SlotDescriptor,
  ValueFormat,
} from '@/types';
import { BindingPicker } from './BindingPicker';

/** Props for {@link BlockInspector}. */
export interface BlockInspectorProps {
  /** The block being edited. */
  block: DashboardBlock;
  /** Persists a new title. */
  onTitleChange: (title: string) => void;
  /** Persists new slot bindings. */
  onSlotsChange: (slots: Record<string, BlockSlot>) => void;
  /** Persists new static options. */
  onOptionsChange: (options: Record<string, unknown>) => void;
  /** Closes the inspector. */
  onClose: () => void;
}

/** Severity vocabulary for color rules. */
const SEVERITIES: PanelSeverity[] = ['neutral', 'info', 'success', 'warning', 'error', 'critical'];
/** Comparison operators for color rules. */
const COMPARE_OPS: CompareOp[] = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains'];
/** Value format families. */
const FORMAT_KINDS: NonNullable<ValueFormat['kind']>[] = [
  'number',
  'date',
  'datetime',
  'relative',
  'duration',
  'bytes',
  'percent',
  'text',
];

/** Generates a stable id for a new bound value. */
function makeValueId(): string {
  return `v-${Date.now()}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * Renders the inspector for the selected block.
 * @param props - See {@link BlockInspectorProps}.
 */
export function BlockInspector({
  block,
  onTitleChange,
  onSlotsChange,
  onOptionsChange,
  onClose,
}: BlockInspectorProps) {
  const descriptor = getComponent(block.componentType)?.descriptor;

  /** Immutably replace the values of one slot. */
  const setSlotValues = (slotKey: string, values: BoundValue[]) => {
    onSlotsChange({ ...block.slots, [slotKey]: { values } });
  };

  const getValues = (slotKey: string): BoundValue[] => [...(block.slots[slotKey]?.values ?? [])];

  const addValue = (slot: SlotDescriptor) => {
    const values = getValues(slot.key);
    if (!slot.multiple && values.length >= 1) return;
    setSlotValues(slot.key, [...values, { id: makeValueId() }]);
  };

  const updateValue = (slotKey: string, id: string, patch: Partial<BoundValue>) => {
    setSlotValues(
      slotKey,
      getValues(slotKey).map((v) => (v.id === id ? { ...v, ...patch } : v)),
    );
  };

  const removeValue = (slotKey: string, id: string) => {
    setSlotValues(
      slotKey,
      getValues(slotKey).filter((v) => v.id !== id),
    );
  };

  const moveValue = (slotKey: string, index: number, dir: -1 | 1) => {
    const values = getValues(slotKey);
    const target = index + dir;
    const a = values[index];
    const b = values[target];
    if (!a || !b) return;
    values[index] = b;
    values[target] = a;
    setSlotValues(slotKey, values);
  };

  const setOption = (key: string, value: unknown) => {
    onOptionsChange({ ...block.options, [key]: value });
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-primary)] px-4 py-3 shrink-0">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {descriptor?.label ?? block.componentType}
          </h2>
          <p className="text-[10px] text-[var(--color-text-tertiary)]">Block settings</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          aria-label="Close inspector"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M9 3L3 9M3 3l6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Title */}
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Title
          </span>
          <input
            type="text"
            value={block.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </label>

        {!descriptor && (
          <p className="text-xs text-[var(--color-text-tertiary)]">
            This component type is not registered; its slots cannot be edited.
          </p>
        )}

        {/* Slots */}
        {descriptor?.slots.map((slot) => {
          const values = block.slots[slot.key]?.values ?? [];
          const canAdd = slot.multiple || values.length === 0;
          return (
            <section key={slot.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {slot.label}
                    {slot.required && <span className="ml-0.5 text-red-500">*</span>}
                  </h3>
                  {slot.description && (
                    <p className="text-[10px] text-[var(--color-text-tertiary)]">
                      {slot.description}
                    </p>
                  )}
                </div>
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => addValue(slot)}
                    className="rounded-md bg-[var(--color-bg-tertiary)] px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    + Value
                  </button>
                )}
              </div>

              {values.length === 0 && (
                <p className="text-[11px] text-[var(--color-text-tertiary)]">No values bound.</p>
              )}

              {values.map((value, index) => (
                <BoundValueEditor
                  key={value.id}
                  value={value}
                  shape={slot.shape}
                  index={index}
                  count={values.length}
                  multiple={Boolean(slot.multiple)}
                  onChange={(patch) => updateValue(slot.key, value.id, patch)}
                  onRemove={() => removeValue(slot.key, value.id)}
                  onMove={(dir) => moveValue(slot.key, index, dir)}
                />
              ))}
            </section>
          );
        })}

        {/* Options */}
        {descriptor?.options && descriptor.options.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">Options</h3>
            {descriptor.options.map((option) => (
              <OptionControl
                key={option.key}
                option={option}
                value={block.options[option.key]}
                onChange={(v) => setOption(option.key, v)}
              />
            ))}
          </section>
        )}
      </div>
    </aside>
  );
}

/** Editor for a single {@link BoundValue}: binding + label + rules + format. */
function BoundValueEditor({
  value,
  shape,
  index,
  count,
  multiple,
  onChange,
  onRemove,
  onMove,
}: {
  value: BoundValue;
  shape: SlotDescriptor['shape'];
  index: number;
  count: number;
  multiple: boolean;
  onChange: (patch: Partial<BoundValue>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-2.5">
      {/* Row controls */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Value {index + 1}
        </span>
        <div className="flex items-center gap-1">
          {multiple && (
            <>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMove(-1)}
                className="px-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === count - 1}
                onClick={() => onMove(1)}
                className="px-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="px-1 text-[var(--color-text-tertiary)] hover:text-red-500"
            aria-label="Remove value"
          >
            ×
          </button>
        </div>
      </div>

      {/* Binding */}
      <BindingPicker
        binding={value.binding}
        shape={shape}
        onChange={(binding) => onChange({ binding })}
      />

      {/* Label */}
      <input
        type="text"
        value={value.label ?? ''}
        placeholder="Label (defaults to field name)"
        onChange={(e) => onChange({ label: e.target.value || undefined })}
        className="w-full rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40"
      />

      {/* Color rules */}
      <ColorRuleEditor
        rules={value.rules ?? []}
        onChange={(rules) => onChange({ rules: rules.length > 0 ? rules : undefined })}
      />

      {/* Format */}
      <FormatEditor format={value.format} onChange={(format) => onChange({ format })} />
    </div>
  );
}

/** Editor for a value's ordered conditional color rules. */
function ColorRuleEditor({
  rules,
  onChange,
}: {
  rules: readonly ColorRule[];
  onChange: (rules: ColorRule[]) => void;
}) {
  const add = () => onChange([...rules, { op: 'lt', value: 0, severity: 'error' }]);
  const update = (index: number, patch: Partial<ColorRule>) =>
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index: number) => onChange(rules.filter((_, i) => i !== index));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Color rules
        </span>
        <button
          type="button"
          onClick={add}
          className="text-[10px] font-medium text-brand-500 hover:text-brand-600"
        >
          + Rule
        </button>
      </div>
      {rules.map((rule, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: color rules have no stable id
        <div key={i} className="flex items-center gap-1">
          <select
            value={rule.op}
            onChange={(e) => update(i, { op: e.target.value as CompareOp })}
            className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-1 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
          >
            {COMPARE_OPS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={String(rule.value)}
            onChange={(e) => {
              const num = Number(e.target.value);
              update(i, {
                value: e.target.value !== '' && !Number.isNaN(num) ? num : e.target.value,
              });
            }}
            className="w-14 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-1.5 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
          />
          <select
            value={rule.severity}
            onChange={(e) => update(i, { severity: e.target.value as PanelSeverity })}
            className="min-w-0 flex-1 rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-1 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 px-1 text-[var(--color-text-tertiary)] hover:text-red-500"
            aria-label="Remove rule"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/** Editor for a value's presentation format. */
function FormatEditor({
  format,
  onChange,
}: {
  format?: ValueFormat;
  onChange: (format: ValueFormat | undefined) => void;
}) {
  const patch = (p: Partial<ValueFormat>) => {
    const next: ValueFormat = { ...format, ...p };
    const isEmpty = !next.kind && next.decimals === undefined && !next.prefix && !next.suffix;
    onChange(isEmpty ? undefined : next);
  };

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <select
        value={format?.kind ?? ''}
        onChange={(e) => patch({ kind: (e.target.value || undefined) as ValueFormat['kind'] })}
        className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-1.5 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
      >
        <option value="">Format: auto</option>
        {FORMAT_KINDS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={format?.decimals ?? ''}
        placeholder="decimals"
        onChange={(e) =>
          patch({ decimals: e.target.value === '' ? undefined : Number(e.target.value) })
        }
        className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-1.5 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
      />
      <input
        type="text"
        value={format?.prefix ?? ''}
        placeholder="prefix"
        onChange={(e) => patch({ prefix: e.target.value || undefined })}
        className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-1.5 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
      />
      <input
        type="text"
        value={format?.suffix ?? ''}
        placeholder="suffix"
        onChange={(e) => patch({ suffix: e.target.value || undefined })}
        className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-1.5 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
      />
    </div>
  );
}

/** A single static component option control. */
function OptionControl({
  option,
  value,
  onChange,
}: {
  option: ComponentOption;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const current = value ?? option.defaultValue;

  if (option.type === 'boolean') {
    return (
      <label className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--color-text-secondary)]">{option.label}</span>
        <input
          type="checkbox"
          checked={Boolean(current)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 accent-brand-500"
        />
      </label>
    );
  }

  if (option.type === 'select') {
    return (
      <label className="block">
        <span className="mb-1 block text-[11px] text-[var(--color-text-secondary)]">
          {option.label}
        </span>
        <select
          value={String(current ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          {(option.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-[var(--color-text-secondary)]">
        {option.label}
      </span>
      <input
        type={option.type === 'number' ? 'number' : 'text'}
        value={current === undefined || current === null ? '' : String(current)}
        onChange={(e) =>
          onChange(option.type === 'number' ? Number(e.target.value) : e.target.value)
        }
        className="w-full rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40"
      />
    </label>
  );
}
