/**
 * @fileoverview Field type system.
 *
 * Data sources describe every field they expose with a {@link FieldType}. The
 * design layer uses this to drive binding autocomplete, validate that a binding
 * feeds a slot of a compatible shape, and pick sensible default formatting.
 *
 * This is intentionally small and closed: a data source cannot invent new
 * primitive kinds, so the platform can always render and format any field.
 */

/** The primitive kinds a data-source field can have. */
export type FieldTypeKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'duration'
  | 'enum'
  | 'url'
  | 'json';

/**
 * A concrete field type: a primitive kind plus optional refinements that the
 * design layer uses for formatting and validation.
 */
export interface FieldType {
  /** The primitive kind of this field. */
  readonly kind: FieldTypeKind;
  /** Allowed values when {@link kind} is `"enum"`. */
  readonly enumValues?: readonly string[];
  /** Unit hint for `number`/`duration` (e.g. `"ms"`, `"count"`, `"%"`). */
  readonly unit?: string;
  /** Whether higher values are semantically "better" (drives default coloring). */
  readonly higherIsBetter?: boolean;
}

/** Whether a field type carries a numeric value that can be aggregated/compared. */
export function isNumericFieldType(type: FieldType): boolean {
  return type.kind === 'number' || type.kind === 'duration';
}

/** Whether a field type is chronological (usable as a time axis). */
export function isTemporalFieldType(type: FieldType): boolean {
  return type.kind === 'datetime';
}
