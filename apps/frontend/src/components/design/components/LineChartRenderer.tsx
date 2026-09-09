/**
 * @fileoverview `line-chart` component — a multi-series line chart (recharts).
 *
 * Each bound value on the `series` slot is one line: its resolved `{ x, y }`
 * points, drawn under its label. Series are merged into one x-indexed dataset by
 * {@link buildChartModel}. Purely presentational and responsive.
 */
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ComponentDescriptor } from '@/types';
import type { ComponentRenderer, ComponentRenderProps } from '../render-types';
import { AXIS_TICK, buildChartModel, ChartTooltip, LEGEND_STYLE } from './chart-common';
import { EmptyState, slotValues } from './common';

const descriptor: ComponentDescriptor = {
  type: 'line-chart',
  label: 'Line Chart',
  description: 'A multi-series line chart over time or categories.',
  icon: '📈',
  slots: [{ key: 'series', label: 'Series', shape: 'series', required: true, multiple: true }],
  defaultWidth: 6,
  defaultHeight: 4,
};

function render({ data }: ComponentRenderProps) {
  const model = buildChartModel(slotValues(data, 'series'));
  if (model.rows.length === 0) return <EmptyState label="No data" />;

  return (
    <div className="h-full w-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={model.rows} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-secondary)"
            strokeOpacity={0.4}
          />
          <XAxis
            dataKey="x"
            tick={AXIS_TICK}
            stroke="var(--color-border-primary)"
            tickLine={false}
          />
          <YAxis
            tick={AXIS_TICK}
            stroke="var(--color-border-primary)"
            tickLine={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-border-primary)' }} />
          {model.series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
          {model.series.map((series) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.name}
              stroke={series.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The `line-chart` renderer registry entry. */
export const LineChartRenderer: ComponentRenderer = { descriptor, render };
