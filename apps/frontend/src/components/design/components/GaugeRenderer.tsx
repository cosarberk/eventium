/**
 * @fileoverview `gauge` component — a half-circle radial gauge (recharts).
 *
 * The single bound value on the `value` slot is read as a scalar, clamped into
 * the `[min, max]` option range, and drawn as a radial arc. The reading is
 * colored by the value's conditional {@link ColorRule}s.
 */
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import type { ComponentDescriptor } from '@/types';
import { evalColorRules, formatValue, toNumber } from '../format';
import type { ComponentRenderer, ComponentRenderProps } from '../render-types';
import { SEVERITY_HEX } from '../severity';
import { EmptyState, effectiveScalar, optionNumber, slotValues } from './common';

const descriptor: ComponentDescriptor = {
  type: 'gauge',
  label: 'Gauge',
  description: 'A radial gauge for a single bounded value.',
  icon: '🎚️',
  slots: [{ key: 'value', label: 'Value', shape: 'scalar', required: true, multiple: false }],
  options: [
    { key: 'min', label: 'Minimum', type: 'number', defaultValue: 0 },
    { key: 'max', label: 'Maximum', type: 'number', defaultValue: 100 },
  ],
  defaultWidth: 3,
  defaultHeight: 3,
};

function render({ data, block }: ComponentRenderProps) {
  const first = slotValues(data, 'value')[0];
  if (!first) return <EmptyState label="No value" />;
  if (first.resolved?.error) return <EmptyState label="Unavailable" />;

  const { boundValue, resolved } = first;
  const scalar = effectiveScalar(boundValue, resolved);
  const value = toNumber(scalar);
  const min = optionNumber(block.options, 'min', 0);
  const max = optionNumber(block.options, 'max', 100);
  const range = max - min || 1;
  const percent = Math.min(100, Math.max(0, ((value - min) / range) * 100));
  const color = SEVERITY_HEX[evalColorRules(scalar, boundValue.rules)];

  return (
    <div className="relative flex h-full w-full items-center justify-center p-2">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ value: percent, fill: color }]}
          innerRadius="70%"
          outerRadius="100%"
          startAngle={180}
          endAngle={0}
          barSize={14}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            dataKey="value"
            angleAxisId={0}
            cornerRadius={8}
            background={{ fill: 'var(--color-surface-hover)' }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {formatValue(scalar, boundValue.format)}
        </span>
        {boundValue.label && (
          <span className="mt-0.5 truncate text-[11px] uppercase tracking-wider opacity-60">
            {boundValue.label}
          </span>
        )}
      </div>
    </div>
  );
}

/** The `gauge` renderer registry entry. */
export const GaugeRenderer: ComponentRenderer = { descriptor, render };
