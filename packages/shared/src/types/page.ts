/**
 * @fileoverview Page model — the design layer's persisted document.
 *
 * A page is a grid of blocks. Each block is an instance of a component type
 * (see {@link ComponentDescriptor}) whose slots are filled with {@link BoundValue}s.
 * A bound value is either a live {@link Binding} to source data or a static
 * literal, plus presentation rules (conditional color, formatting).
 *
 * Cross-source is intrinsic: every bound value carries its own binding, so a
 * single block can mix `gitlab:…`, `nexus:…`, etc. There is no per-block source.
 */

import type { Binding, CompareOp } from './binding.js';
import type { PanelSeverity } from './panel-view.js';

/** Grid position of a block (0-based, in grid columns/rows). */
export interface BlockPosition {
  readonly x: number;
  readonly y: number;
}

/** Grid size of a block (in grid columns/rows). */
export interface BlockSize {
  readonly w: number;
  readonly h: number;
}

/**
 * How a resolved value is rendered as text. Applied uniformly by every renderer
 * so formatting is a design concern, not a data-source one.
 */
export interface ValueFormat {
  /** Formatting family; defaults to the field type's natural rendering. */
  readonly kind?:
    | 'number'
    | 'date'
    | 'datetime'
    | 'relative'
    | 'duration'
    | 'bytes'
    | 'percent'
    | 'text';
  /** Fixed decimal places for numeric kinds. */
  readonly decimals?: number;
  /** Text prepended to the formatted value. */
  readonly prefix?: string;
  /** Text appended to the formatted value. */
  readonly suffix?: string;
}

/**
 * A user-defined conditional color rule — the "value under 40 turns red"
 * mechanism. Rules are evaluated in order; the first match wins. Applies to any
 * component slot that renders a value with a severity color.
 */
export interface ColorRule {
  /** Comparison against {@link ColorRule.value}. */
  readonly op: CompareOp;
  /** Threshold to compare the resolved value against. */
  readonly value: string | number;
  /** Severity color applied when the comparison holds. */
  readonly severity: PanelSeverity;
}

/**
 * A single filled inlet: one binding (or static value) plus how it is labeled,
 * colored, and formatted. A table column, a chart series, and a stat value are
 * all `BoundValue`s.
 */
export interface BoundValue {
  /** Stable id within the block (drag/reorder key). */
  readonly id: string;
  /** Live data binding. Mutually exclusive with {@link BoundValue.staticValue}. */
  readonly binding?: Binding;
  /** Static literal, used when there is no binding (e.g. a text label column). */
  readonly staticValue?: string | number | boolean | null;
  /** Column header / series name; defaults to the bound field's label. */
  readonly label?: string;
  /** Conditional color rules, first match wins. */
  readonly rules?: readonly ColorRule[];
  /** Presentation formatting. */
  readonly format?: ValueFormat;
}

/**
 * The bindings attached to one component slot. A single-binding slot holds one
 * value; a `multiple` slot (table columns, chart series) holds several.
 */
export interface BlockSlot {
  /** One entry per binding; order is the display order. */
  readonly values: readonly BoundValue[];
}

/**
 * A component instance placed on a page. Fully declarative — no code.
 */
export interface PageBlock {
  /** Unique id within the page. */
  readonly id: string;
  /** {@link ComponentDescriptor.type} this block renders. */
  readonly componentType: string;
  /** User-facing title (empty string hides the header). */
  readonly title: string;
  /** Grid position. */
  readonly position: BlockPosition;
  /** Grid size. */
  readonly size: BlockSize;
  /** Slot key → attached bindings. */
  readonly slots: Record<string, BlockSlot>;
  /** Static component options (see {@link ComponentDescriptor.options}). */
  readonly options: Record<string, unknown>;
}

/**
 * A design-layer page. The unit of display, broadcast, and sharing. (Persisted
 * as the platform's "dashboard" entity for broadcast/live compatibility.)
 */
export interface Page {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  /** Total grid columns (default 12). */
  readonly columns: number;
  /** The blocks composing the page. */
  readonly blocks: readonly PageBlock[];
  /** Whether this is the default page shown on load. */
  readonly isDefault: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * A portable page definition for export/import/sharing. Strips server identity
 * (ids, timestamps) and instance-specific binding fields, and records which
 * source *types* it references so the importer can map them to local instances.
 */
export interface PageSpec {
  /** Spec format version for forward compatibility. */
  readonly specVersion: 1;
  readonly name: string;
  readonly description?: string;
  readonly columns: number;
  /** Blocks with instance-agnostic bindings (no `instanceId`). */
  readonly blocks: readonly PageBlock[];
  /** Distinct data-source types referenced by any binding (e.g. `["gitlab"]`). */
  readonly requiredSources: readonly string[];
}
