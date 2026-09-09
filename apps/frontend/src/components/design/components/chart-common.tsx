/**
 * @fileoverview Shared chart infrastructure for the line/bar renderers.
 *
 * Both renderers bind a `series`-shaped slot with multiple bound values, each a
 * named series of `{ x, y }` points. `buildChartModel` merges those series into
 * the single row-per-x dataset recharts expects, keyed by bound-value id, and
 * assigns each a stable color. The tooltip and axis styling below keep both
 * charts visually consistent and theme-aware.
 */
import type { CSSProperties } from 'react';
import type { TooltipProps } from 'recharts';
import type { ResolvedSlotValue } from '../render-types';

/** Categorical series palette — mid-tone hues legible on light and dark surfaces. */
export const SERIES_COLORS = [
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#a78bfa',
  '#f87171',
  '#22d3ee',
  '#a3e635',
] as const;

const FALLBACK_COLOR = '#94a3b8';

/** Tick style for chart axes, driven by theme text color. */
export const AXIS_TICK = { fill: 'var(--color-text-tertiary)', fontSize: 11 } as const;

/** Legend wrapper style. */
export const LEGEND_STYLE: CSSProperties = { fontSize: 11, paddingTop: 4 };

/** One resolved series ready to draw. */
export interface ChartSeries {
  /** dataKey used on the merged rows (the bound-value id). */
  readonly key: string;
  /** Display name shown in the legend/tooltip. */
  readonly name: string;
  /** Stroke/fill color. */
  readonly color: string;
}

/** A recharts-ready dataset: rows keyed by series id, plus series metadata. */
export interface ChartModel {
  readonly rows: Record<string, string | number>[];
  readonly series: ChartSeries[];
}

/**
 * Merge every bound series in a slot into one dataset indexed by x. Missing
 * points simply leave a gap for that series on that x.
 * @param values - The slot's ordered resolved bound values.
 */
export function buildChartModel(values: ResolvedSlotValue[]): ChartModel {
  const series: ChartSeries[] = [];
  const rowMap = new Map<string | number, Record<string, string | number>>();

  values.forEach(({ boundValue, resolved }, idx) => {
    const key = boundValue.id;
    series.push({
      key,
      name: boundValue.label ?? `Series ${idx + 1}`,
      color: SERIES_COLORS[idx % SERIES_COLORS.length] ?? FALLBACK_COLOR,
    });

    if (!resolved || resolved.error !== undefined || !resolved.series) return;
    for (const point of resolved.series) {
      let row = rowMap.get(point.x);
      if (!row) {
        row = { x: point.x };
        rowMap.set(point.x, row);
      }
      row[key] = point.y;
    }
  });

  return { rows: Array.from(rowMap.values()), series };
}

/** Theme-aware tooltip shared by the line and bar charts. */
export function ChartTooltip({ active, payload, label }: TooltipProps<number | string, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md px-2.5 py-1.5 text-xs shadow-lg"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-primary)',
        color: 'var(--color-text-primary)',
      }}
    >
      {label !== undefined && label !== '' && (
        <div className="mb-1 font-medium opacity-70">{String(label)}</div>
      )}
      {payload.map((entry, i) => (
        <div
          key={`${String(entry.dataKey ?? entry.name)}-${i}`}
          className="flex items-center gap-1.5"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: entry.color ?? FALLBACK_COLOR }}
          />
          <span className="opacity-70">{entry.name}</span>
          <span className="ml-auto pl-3 font-mono font-semibold tabular-nums">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
