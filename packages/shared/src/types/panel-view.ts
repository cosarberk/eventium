/**
 * @fileoverview Render primitives shared by component renderers.
 *
 * These are NOT produced by plugins anymore. They are the low-level building
 * blocks the frontend component renderers consume after the design layer has
 * resolved bindings and compiled a block's data. `PanelSeverity` is the single
 * semantic color vocabulary used for value coloring across every component and
 * by user-defined {@link ColorRule}s.
 */

/**
 * Semantic color used for values, badges, and cells. Decoupled from event
 * severity so a component can express success/neutral states too.
 */
export type PanelSeverity = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'critical';

/** A single statistic rendered as a large number card. */
export interface PanelStat {
  readonly label: string;
  readonly value: string | number;
  readonly sublabel?: string;
  readonly severity?: PanelSeverity;
  readonly trend?: 'up' | 'down' | 'flat';
}

/**
 * A rich table cell. A plain string/number renders as text; the object form
 * allows badges, coloring, and links.
 */
export type PanelCell =
  | string
  | number
  | null
  | {
      readonly text: string | number;
      readonly badge?: boolean;
      readonly severity?: PanelSeverity;
      readonly href?: string;
      readonly mono?: boolean;
    };

/** A table column descriptor. */
export interface PanelColumn {
  readonly key: string;
  readonly label: string;
  readonly align?: 'left' | 'center' | 'right';
  readonly width?: string;
}

/** A timeline/feed entry. */
export interface PanelTimelineItem {
  readonly title: string;
  readonly subtitle?: string;
  readonly timestamp?: string;
  readonly severity?: PanelSeverity;
  readonly href?: string;
}

/** A badge in a badge grid (e.g. a version/status board entry). */
export interface PanelBadge {
  readonly label: string;
  readonly value?: string;
  readonly sublabel?: string;
  readonly severity?: PanelSeverity;
  readonly href?: string;
}

/** A single point in a chart series. */
export interface PanelSeriesPoint {
  /** X axis value: a timestamp (ISO) or a category label. */
  readonly x: string | number;
  /** Y axis value. */
  readonly y: number;
}

/** A named chart series (one line/bar group). */
export interface PanelSeries {
  readonly name: string;
  readonly points: readonly PanelSeriesPoint[];
  readonly severity?: PanelSeverity;
}
