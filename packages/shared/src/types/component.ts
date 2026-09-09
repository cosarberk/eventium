/**
 * @fileoverview Component descriptor contract.
 *
 * The design layer knows nothing about specific components (table, stat, chart,
 * …). It reads a registry of {@link ComponentDescriptor}s. Each descriptor
 * declares the *slots* a component exposes; the user binds each slot to source
 * data. Adding a new component = adding a descriptor + a renderer, with zero
 * core changes.
 *
 * The same descriptor set is shared by the frontend (to render and to build the
 * inspector UI) and the backend (to validate pages), so it lives here.
 */

import type { BindingShape } from './binding.js';
import type { FieldTypeKind } from './field-type.js';

/**
 * A named data inlet on a component. The user attaches one or more bindings to
 * it (see {@link BlockSlot}).
 */
export interface SlotDescriptor {
  /** Machine key, unique within the component (e.g. `value`, `columns`, `series`). */
  readonly key: string;
  /** Human-readable label shown in the inspector. */
  readonly label: string;
  /** The data shape each binding on this slot must produce. */
  readonly shape: BindingShape;
  /** Whether the component cannot render without at least one binding here. */
  readonly required: boolean;
  /**
   * Whether the slot accepts multiple bindings (e.g. a table's `columns` or a
   * multiline chart's `series`). A single-binding slot (a stat's `value`) is
   * `false`/omitted.
   */
  readonly multiple?: boolean;
  /** Restrict acceptable field kinds (e.g. a chart y-axis wants numbers). */
  readonly accepts?: readonly FieldTypeKind[];
  /** Help text. */
  readonly description?: string;
}

/** The type of a static, non-bound component option control. */
export type ComponentOptionType = 'string' | 'number' | 'boolean' | 'select';

/**
 * A static configuration knob for a component that is *not* data-bound
 * (e.g. a chart's "stacked" toggle, a table's "page size").
 */
export interface ComponentOption {
  readonly key: string;
  readonly label: string;
  readonly type: ComponentOptionType;
  readonly defaultValue?: string | number | boolean;
  readonly options?: readonly { readonly label: string; readonly value: string }[];
  readonly description?: string;
}

/**
 * The full definition of a component type. The registry maps `type` → descriptor
 * (+ a renderer on the frontend).
 */
export interface ComponentDescriptor {
  /** Machine type, e.g. `table`, `stat`, `line-chart`, `badge`, `separator`. */
  readonly type: string;
  /** Human-readable name shown in the component picker. */
  readonly label: string;
  /** Short description for the picker. */
  readonly description: string;
  /** Icon (emoji or short glyph) for the picker. */
  readonly icon: string;
  /** Data inlets the user binds. Empty for purely presentational components. */
  readonly slots: readonly SlotDescriptor[];
  /** Static, non-bound options. */
  readonly options?: readonly ComponentOption[];
  /** Default grid width in columns. */
  readonly defaultWidth: number;
  /** Default grid height in rows. */
  readonly defaultHeight: number;
}
