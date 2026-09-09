/**
 * @fileoverview Zod schemas for event-related structures.
 */

import { z } from 'zod';

/** Dotted machine type, e.g. `gitlab.pipeline.failed`. */
const eventTypePattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

/** Severity values — UPPERCASE, matching the persisted enum. */
export const eventSeveritySchema = z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']);

/** A stream event type declared in a data-source capability descriptor. */
export const streamEventDescriptorSchema = z.object({
  type: z
    .string()
    .min(1)
    .regex(eventTypePattern, 'Event type must be dotted (e.g. gitlab.pipeline.failed)'),
  label: z.string().min(1).max(128),
  description: z.string().min(1).max(512),
  defaultSeverity: eventSeveritySchema,
});

/** The event shape a data source emits before enrichment. */
export const emittedEventSchema = z.object({
  eventType: z.string().min(1).regex(eventTypePattern),
  title: z.string().min(1).max(256),
  description: z.string().max(4096).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  severity: eventSeveritySchema.optional(),
});

export type EventSeveritySchema = z.infer<typeof eventSeveritySchema>;
export type StreamEventDescriptorSchema = z.infer<typeof streamEventDescriptorSchema>;
export type EmittedEventSchema = z.infer<typeof emittedEventSchema>;
