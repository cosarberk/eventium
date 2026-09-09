/**
 * @fileoverview Event model.
 *
 * The single, canonical event shape flowing through the platform. Data sources
 * emit {@link EmittedEvent}s; the platform enriches them into {@link PlatformEvent}s
 * (assigning ids, instance, timestamp) before persistence and fan-out.
 *
 * Severity is UPPERCASE across the whole stack (matching the persisted enum and
 * every plugin manifest) — there is exactly one casing.
 */

/** Severity levels for events, ordered from least to most critical. */
export type EventSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * The event shape a data source emits, before platform enrichment.
 */
export interface EmittedEvent {
  /** Dotted machine type, e.g. `gitlab.pipeline.failed`. */
  readonly eventType: string;
  /** Short, human-readable summary. */
  readonly title: string;
  /** Optional detailed description. */
  readonly description?: string;
  /** Arbitrary structured payload specific to the event type. */
  readonly payload?: Record<string, unknown>;
  /** Severity override; falls back to the event type's default. */
  readonly severity?: EventSeverity;
}

/**
 * A fully-enriched event as persisted and broadcast by the platform.
 */
export interface PlatformEvent {
  /** Globally unique event id. */
  readonly id: string;
  /** The source instance that produced this event. */
  readonly pluginInstanceId: string;
  /** The data-source *type* (e.g. `gitlab`) of the producing instance. */
  readonly sourceType: string;
  /** Dotted machine event type. */
  readonly eventType: string;
  /** Short, human-readable summary. */
  readonly title: string;
  /** Detailed description (empty string when absent). */
  readonly description: string;
  /** Arbitrary structured payload. */
  readonly payload: Record<string, unknown>;
  /** Severity of this specific event. */
  readonly severity: EventSeverity;
  /** ISO-8601 timestamp of when the platform ingested the event. */
  readonly createdAt: string;
}
