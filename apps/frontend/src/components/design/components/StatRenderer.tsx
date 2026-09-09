/**
 * @fileoverview `stat` component — a responsive grid of large number cards.
 *
 * Each bound value on the `value` slot becomes one card: its resolved scalar is
 * formatted per the value's {@link ValueFormat} and colored by its conditional
 * {@link ColorRule}s (the "under 40 turns red" mechanism).
 */
import type { ComponentDescriptor } from '@/types';
import { evalColorRules, formatValue } from '../format';
import type { ComponentRenderer, ComponentRenderProps } from '../render-types';
import { severityStyle } from '../severity';
import { EmptyState, effectiveScalar, slotValues } from './common';

const descriptor: ComponentDescriptor = {
  type: 'stat',
  label: 'Stat',
  description: 'Large number cards for key metrics.',
  icon: '🔢',
  slots: [{ key: 'value', label: 'Value', shape: 'scalar', required: true, multiple: true }],
  defaultWidth: 12,
  defaultHeight: 2,
};

function render({ data }: ComponentRenderProps) {
  const values = slotValues(data, 'value');
  if (values.length === 0) return <EmptyState label="No metrics" />;

  return (
    <div
      className="grid h-full content-start gap-3 p-3"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}
    >
      {values.map(({ boundValue, resolved }) => {
        const scalar = effectiveScalar(boundValue, resolved);
        const error = resolved?.error;
        const style = severityStyle(evalColorRules(scalar, boundValue.rules));
        return (
          <div
            key={boundValue.id}
            className="flex flex-col justify-center rounded-lg border border-current/10 bg-current/[0.03] px-4 py-3"
          >
            <span className="truncate text-[11px] font-medium uppercase tracking-wider opacity-60">
              {boundValue.label ?? '—'}
            </span>
            <span
              className={`mt-1 text-3xl font-bold leading-none tabular-nums ${
                error ? 'opacity-40' : style.text
              }`}
              title={error}
            >
              {error ? '—' : formatValue(scalar, boundValue.format)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The `stat` renderer registry entry. */
export const StatRenderer: ComponentRenderer = { descriptor, render };
