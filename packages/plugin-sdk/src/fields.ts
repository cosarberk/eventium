/**
 * @fileoverview Field-descriptor builders.
 *
 * Terse helpers for declaring an entity's fields in a capability descriptor,
 * so a plugin author writes `f.datetime('createdAt', 'Created')` instead of the
 * full `{ key, label, type: { kind: 'datetime' } }` object.
 */

import type { FieldDescriptor, FieldType } from '@eventium/shared';

interface FieldOpts {
  readonly description?: string;
  readonly unit?: string;
  readonly higherIsBetter?: boolean;
}

function make(kind: FieldType['kind']) {
  return (key: string, label: string, opts: FieldOpts = {}): FieldDescriptor => ({
    key,
    label,
    type: { kind, unit: opts.unit, higherIsBetter: opts.higherIsBetter },
    description: opts.description,
  });
}

/** Field builders keyed by primitive kind. */
export const f = {
  string: make('string'),
  number: make('number'),
  boolean: make('boolean'),
  datetime: make('datetime'),
  duration: make('duration'),
  url: make('url'),
  json: make('json'),
  /** Enum field with a fixed value set. */
  enum(
    key: string,
    label: string,
    values: readonly string[],
    opts: FieldOpts = {},
  ): FieldDescriptor {
    return {
      key,
      label,
      type: { kind: 'enum', enumValues: values },
      description: opts.description,
    };
  },
} as const;
