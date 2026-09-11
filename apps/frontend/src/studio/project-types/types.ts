/**
 * @fileoverview Project-type contract — the extensibility spine of the studio.
 *
 * A project type (Dashboard, Site, App, Report, Blank, …) is described entirely
 * by a {@link ProjectTypeDescriptor}. The launcher, the editor's focus, the
 * palette, the default layout mode and the publish targets are all *derived*
 * from these descriptors — there is no hardcoded `switch(type)` anywhere. Adding
 * a new type is one descriptor file plus a `registerProjectType` call.
 */

/** How the canvas arranges blocks by default for a project type. */
export type LayoutMode =
  /** Snap 12-column grid (dashboards / BI). */
  | 'grid'
  /** Absolute free canvas (sites / tools) — Windows-Forms / Figma feel. */
  | 'free'
  /** Top-to-bottom document flow (reports / docs). */
  | 'flow';

/** A view a workspace pane can host. */
export type PaneKind = 'design' | 'code' | 'blueprint' | 'data' | 'preview' | 'layers';

/** Where a finished project can run / be published. */
export type PublishTarget = 'broadcast' | 'embed' | 'page' | 'app' | 'export';

/**
 * A grouping of palette entries shown for a project type, focusing the editor to
 * that domain without restricting it.
 */
export interface PaletteGroup {
  /** Stable id. */
  readonly id: string;
  /** Section header shown in the palette. */
  readonly label: string;
  /**
   * Component descriptor `type`s surfaced in this group, in display order. An
   * empty array means "every registered component" (the fully-open Blank type).
   */
  readonly components: readonly string[];
}

/**
 * A starter graph applied to a freshly created project of this type: initial
 * blocks and default variables. Kept as a factory so ids stay fresh per project.
 */
export interface ProjectStarter {
  /** Human title suggestion for the first page. */
  readonly pageTitle?: string;
  /** Default runtime variables to seed. */
  readonly variables?: Readonly<Record<string, string>>;
}

/**
 * The full description of a project type. Everything the studio needs to present
 * and focus the editor for this kind of project is here.
 */
export interface ProjectTypeDescriptor {
  /** Unique id, e.g. `dashboard`. */
  readonly id: string;
  /** Display name shown on the launcher card, e.g. `Dashboard`. */
  readonly label: string;
  /** One-line description for the launcher card. */
  readonly description: string;
  /** Emoji/glyph icon for the launcher card. */
  readonly icon: string;
  /**
   * Accent color for the launcher card. A CSS color or `var(--…)` token; the
   * card falls back to the brand accent when omitted.
   */
  readonly accent?: string;
  /** Whether to feature this type prominently (order/size) on the launcher. */
  readonly featured?: boolean;
  /** Default canvas layout mode. */
  readonly layoutMode: LayoutMode;
  /** Panes opened by default when the project is created. */
  readonly defaultPanes: readonly PaneKind[];
  /** Palette groups shown for this type. */
  readonly palette: readonly PaletteGroup[];
  /** Publish/run targets this type supports. */
  readonly publishTargets: readonly PublishTarget[];
  /** Optional starter content applied to a new project. */
  readonly starter?: () => ProjectStarter;
}
