/**
 * @fileoverview Data-source contract.
 *
 * The core inversion of the platform: a plugin is a *pure data source*. It never
 * ships UI and never decides how anything is displayed. It only:
 *
 *   1. declares a {@link CapabilityDescriptor} — the entities it can be queried
 *      for, the fields (with types) each entity exposes, and the event types it
 *      streams;
 *   2. answers resource queries ({@link ResourceQuery} → {@link ResourceResult});
 *   3. streams normalized events into the platform's event bus.
 *
 * The design layer reads the descriptor to build the binding vocabulary
 * (`sourceType:entity.field`) and autocomplete; it never hard-codes any source.
 */

import type { EventSeverity } from './event.js';
import type { FieldType } from './field-type.js';

/**
 * A single queryable field on an entity. Its `key` is the last segment of a
 * binding reference (e.g. `createdAt` in `gitlab:repository.createdAt`).
 */
export interface FieldDescriptor {
  /** Machine key, unique within the entity. */
  readonly key: string;
  /** Human-readable column/label text shown in the binding picker. */
  readonly label: string;
  /** The type of values this field produces. */
  readonly type: FieldType;
  /** Optional help text shown in the picker. */
  readonly description?: string;
}

/**
 * A queryable collection of records the data source can return. A row is a flat
 * map from {@link FieldDescriptor.key} to a primitive value.
 */
export interface EntityDescriptor {
  /** Machine key, unique within the source (e.g. `repository`, `pipeline`). */
  readonly key: string;
  /** Human-readable label shown in the binding picker. */
  readonly label: string;
  /** The fields every row of this entity exposes. */
  readonly fields: readonly FieldDescriptor[];
  /** Optional help text. */
  readonly description?: string;
  /**
   * Optional parameters this entity accepts to scope a query (e.g. a project id
   * for `pipeline`). Surfaced in the binding UI as filters.
   */
  readonly params?: readonly EntityParam[];
}

/** A parameter an entity query accepts (e.g. `projectId`). */
export interface EntityParam {
  readonly key: string;
  readonly label: string;
  readonly type: FieldType;
  readonly required: boolean;
}

/**
 * An event type the data source emits into the stream. Consumed by the
 * notification engine and the live/TV alarm; not a display concern.
 */
export interface StreamEventDescriptor {
  /** Dotted machine type, e.g. `gitlab.pipeline.failed`. */
  readonly type: string;
  /** Human-readable label. */
  readonly label: string;
  /** When this event fires. */
  readonly description: string;
  /** Severity assigned unless the emitter overrides it. */
  readonly defaultSeverity: EventSeverity;
}

/**
 * The complete, machine-readable capability surface of a data source. Derived
 * from the plugin's descriptor at discovery time; the binding vocabulary the
 * design layer offers is computed entirely from this.
 */
export interface CapabilityDescriptor {
  /** Queryable entities (drive field bindings). */
  readonly entities: readonly EntityDescriptor[];
  /** Event types streamed (drive notifications and the live alarm). */
  readonly events: readonly StreamEventDescriptor[];
}

/**
 * A request for records of one entity, optionally scoped by params. Issued by
 * the backend binding resolver against a concrete source instance.
 */
export interface ResourceQuery {
  /** {@link EntityDescriptor.key} being queried. */
  readonly entity: string;
  /** Values for the entity's declared {@link EntityParam}s. */
  readonly params?: Record<string, unknown>;
  /** Upper bound on rows to return; the source may cap this further. */
  readonly limit?: number;
}

/** The result of a {@link ResourceQuery}: flat rows keyed by field key. */
export interface ResourceResult {
  /** Rows, each a map of field key → primitive value. */
  readonly rows: ReadonlyArray<Record<string, unknown>>;
}
