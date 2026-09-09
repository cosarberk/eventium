/**
 * @fileoverview Binding language.
 *
 * A binding connects one design-layer slot to data from a source. The address
 * grammar is fixed by the platform (`sourceType:entity.field`); the *vocabulary*
 * — which sources/entities/fields exist — is contributed entirely by data-source
 * {@link CapabilityDescriptor}s.
 *
 * Bindings reference a source by **type** (`gitlab`), not by a concrete instance
 * id, so a page spec is portable: exporting and re-importing on another server
 * only requires mapping each referenced type to a locally installed instance.
 */

/**
 * The shape of data a resolved binding yields, which must match the slot it
 * feeds:
 * - `scalar` — a single value (a stat, a badge value, a gauge reading);
 * - `series` — an ordered list of `{ x, y }` points (a line/bar chart series);
 * - `list`   — a list of records (a table column, a repeated badge board).
 */
export type BindingShape = 'scalar' | 'series' | 'list';

/**
 * How a `list` of field values collapses to a single `scalar`. Ignored for
 * `series`/`list` slots.
 */
export type Aggregation = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'first' | 'latest';

/** Comparison operators usable in a binding filter or a color rule. */
export type CompareOp = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'contains';

/** A predicate that narrows the rows a binding reads before aggregation. */
export interface BindingFilter {
  /** Field key (on the same entity) to test. */
  readonly field: string;
  readonly op: CompareOp;
  readonly value: string | number | boolean;
}

/**
 * A structured, parsed field address: `sourceType:entity.field`.
 * `sourceType` is a plugin *type* (portable), never an instance id.
 */
export interface FieldRef {
  /** Data-source type, e.g. `gitlab`. */
  readonly sourceType: string;
  /** Entity key, e.g. `repository`. */
  readonly entity: string;
  /** Field key, e.g. `createdAt`. */
  readonly field: string;
}

/**
 * A concrete data binding placed on a page. Combines a portable field address
 * with the instance it resolves against and how it is reduced/scoped.
 */
export interface Binding {
  /** Portable address, e.g. `gitlab:repository.createdAt`. */
  readonly ref: string;
  /**
   * Instance this binding resolves against. Omitted in a portable spec; filled
   * in during import (or defaulted to the sole instance of the referenced type).
   */
  readonly instanceId?: string;
  /** Params passed to the entity query (e.g. a selected project id). */
  readonly params?: Record<string, unknown>;
  /** Row filters applied before aggregation. */
  readonly filters?: readonly BindingFilter[];
  /** Reduction to a scalar; required only when feeding a `scalar` slot. */
  readonly aggregate?: Aggregation;
  /** For `series`: the field to use as the x (time) axis. */
  readonly xField?: string;
  /** Upper bound on rows read. */
  readonly limit?: number;
}

/**
 * The resolved output of a {@link Binding}, shaped to match the slot it feeds.
 * Returned by the backend binding resolver and consumed by component renderers.
 */
export interface ResolvedBinding {
  /** The binding ref this resolves (for correlation on the client). */
  readonly ref: string;
  /** Which of the value fields below is populated. */
  readonly shape: BindingShape;
  /** Present when `shape === 'scalar'`. */
  readonly scalar?: string | number | boolean | null;
  /** Present when `shape === 'series'`. */
  readonly series?: ReadonlyArray<{ readonly x: string | number; readonly y: number }>;
  /** Present when `shape === 'list'`. */
  readonly list?: ReadonlyArray<string | number | boolean | null>;
  /** Set instead of a value when resolution failed. */
  readonly error?: string;
}

const FIELD_REF_PATTERN = /^([a-z][a-z0-9-]*):([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)$/i;

/**
 * Parse a `sourceType:entity.field` address into its parts.
 * @returns the parsed {@link FieldRef}, or `null` if the string is malformed.
 */
export function parseFieldRef(ref: string): FieldRef | null {
  const match = FIELD_REF_PATTERN.exec(ref.trim());
  if (!match) return null;
  const [, sourceType, entity, field] = match;
  return { sourceType, entity, field };
}

/** Serialize a {@link FieldRef} back to its `sourceType:entity.field` string. */
export function formatFieldRef(ref: FieldRef): string {
  return `${ref.sourceType}:${ref.entity}.${ref.field}`;
}

/** Whether a string is a syntactically valid field reference. */
export function isValidFieldRef(ref: string): boolean {
  return FIELD_REF_PATTERN.test(ref.trim());
}
