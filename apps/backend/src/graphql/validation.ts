/**
 * @file Input validation for the GraphQL API.
 *
 * The SDL types many inputs as the `JSON` scalar (slots, options, bindings,
 * rule actions), which means the schema itself guarantees almost nothing about
 * their contents. Every mutation argument is therefore parsed here before it
 * reaches a service, so malformed or hostile payloads fail at the edge instead
 * of being persisted and rendered later.
 */

import { z } from 'zod';
import { ValidationError } from '../utils/index.js';

/** A CSS-grid position on the page. */
const positionSchema = z.object({
  x: z.coerce.number().int().min(0).max(48),
  y: z.coerce.number().int().min(0).max(500),
});

/** A block's grid footprint. */
const sizeSchema = z.object({
  w: z.coerce.number().int().min(1).max(24),
  h: z.coerce.number().int().min(1).max(64),
});

/** `sourceType:entity.field` binding address. */
const fieldRefSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*:[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/i,
    'Binding ref must be sourceType:entity.field',
  );

const compareOpSchema = z.enum(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains']);

/** A single binding as submitted for resolution. */
export const bindingInputSchema = z.object({
  ref: fieldRefSchema,
  instanceId: z.string().min(1).max(64).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  filters: z
    .array(
      z.object({
        field: z.string().min(1).max(128),
        op: compareOpSchema,
        value: z.union([z.string().max(512), z.number(), z.boolean()]),
      }),
    )
    .max(20)
    .optional(),
  aggregate: z.enum(['count', 'sum', 'avg', 'min', 'max', 'first', 'latest']).optional(),
  xField: z.string().min(1).max(128).optional(),
  limit: z.coerce.number().int().positive().max(1000).optional(),
});

/** The array accepted by `resolveBindings`. */
export const bindingsArraySchema = z.array(bindingInputSchema).max(200);

/** One bound value inside a slot. */
const boundValueSchema = z.object({
  id: z.string().min(1).max(64),
  binding: bindingInputSchema.optional(),
  staticValue: z.union([z.string().max(4096), z.number(), z.boolean(), z.null()]).optional(),
  label: z.string().max(128).optional(),
  rules: z
    .array(
      z.object({
        op: compareOpSchema,
        value: z.union([z.string().max(512), z.number()]),
        severity: z.enum(['neutral', 'info', 'success', 'warning', 'error', 'critical']),
      }),
    )
    .max(20)
    .optional(),
  format: z
    .object({
      kind: z
        .enum(['number', 'date', 'datetime', 'relative', 'duration', 'bytes', 'percent', 'text'])
        .optional(),
      decimals: z.coerce.number().int().min(0).max(10).optional(),
      prefix: z.string().max(16).optional(),
      suffix: z.string().max(16).optional(),
    })
    .optional(),
});

/** A block slot: an ordered list of bound values. */
const slotSchema = z.object({ values: z.array(boundValueSchema).max(64) });

/** A component block on a page. */
const blockInputSchema = z.object({
  componentType: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9-]*$/i, 'componentType must be an identifier'),
  title: z.string().max(200).optional(),
  slots: z.record(z.string().max(64), slotSchema).optional(),
  options: z.record(z.string().max(64), z.unknown()).optional(),
  position: positionSchema.optional(),
  size: sizeSchema.optional(),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
});

/** Page-level layout options. */
const layoutSchema = z
  .object({ columns: z.coerce.number().int().min(1).max(24).optional() })
  .catchall(z.unknown());

/** `createDashboard` input. */
export const createDashboardSchema = z.object({
  name: z.string().trim().min(1).max(128),
  description: z.string().max(1024).optional(),
  layout: layoutSchema.optional(),
  isDefault: z.boolean().optional(),
  blocks: z.array(blockInputSchema).max(200).optional(),
});

/** `updateDashboard` input. */
export const updateDashboardSchema = createDashboardSchema.partial();

/** `installPlugin` input. */
export const installPluginSchema = z.object({
  pluginId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9-]*$/, 'pluginId must be lowercase alphanumeric with hyphens'),
  name: z.string().trim().min(1).max(128),
  config: z.record(z.string().max(64), z.unknown()).optional(),
});

/** `configurePlugin` input. */
export const configurePluginSchema = z.object({
  config: z.record(z.string().max(64), z.unknown()),
});

/** A notification rule condition. */
const ruleConditionSchema = z.object({
  field: z.string().min(1).max(128),
  operator: z.enum(['eq', 'neq', 'contains', 'gt', 'lt']),
  value: z.union([z.string().max(512), z.number(), z.boolean()]),
});

/**
 * A notification rule action. `webhook` requires an http(s) URL; reachability
 * and private-address checks happen at delivery time (see `assertPublicHttpUrl`).
 */
const ruleActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('webhook'),
    config: z.object({
      url: z.url().max(2048),
    }),
  }),
  z.object({
    type: z.literal('log'),
    config: z.record(z.string(), z.unknown()).optional().default({}),
  }),
]);

/** Event-type pattern: a dotted type, a `prefix.*` glob, or `*`. */
const eventPatternSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^(\*|[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*(\.\*)?)$/,
    'eventPattern must be "*", "prefix.*", or a dotted event type',
  );

/** `createNotificationRule` input. */
export const createNotificationRuleSchema = z.object({
  name: z.string().trim().min(1).max(128),
  eventPattern: eventPatternSchema,
  conditions: z.array(ruleConditionSchema).max(20).optional().default([]),
  actions: z.array(ruleActionSchema).min(1).max(10),
  enabled: z.boolean().optional(),
});

/** `updateNotificationRule` input. */
export const updateNotificationRuleSchema = z.object({
  name: z.string().trim().min(1).max(128).optional(),
  eventPattern: eventPatternSchema.optional(),
  conditions: z.array(ruleConditionSchema).max(20).optional(),
  actions: z.array(ruleActionSchema).min(1).max(10).optional(),
  enabled: z.boolean().optional(),
});

/** `createBroadcastLink` input. */
export const createBroadcastLinkSchema = z.object({
  name: z.string().trim().min(1).max(128),
  dashboardIds: z.array(z.string().min(1).max(64)).min(1).max(50),
});

/** `updateBroadcastLink` input. */
export const updateBroadcastLinkSchema = z.object({
  name: z.string().trim().min(1).max(128).optional(),
  enabled: z.boolean().optional(),
  dashboardIds: z.array(z.string().min(1).max(64)).max(50).optional(),
});

/** `events` query filter. */
export const eventFilterSchema = z
  .object({
    pluginInstanceId: z.string().min(1).max(64).optional(),
    eventType: z.string().min(1).max(128).optional(),
    severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
    after: z.iso.datetime({ offset: true }).optional(),
    before: z.iso.datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    offset: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .optional()
  .default({});

/** `importPage` source mapping: source type -> instance id. */
export const sourceMappingSchema = z.record(z.string().min(1).max(64), z.string().min(1).max(64));

/** An opaque identifier argument. */
export const idSchema = z.string().min(1).max(64);

/** A broadcast token argument. */
export const tokenSchema = z.string().min(8).max(128);

/**
 * Parse a value, converting Zod failures into a single-line message suitable
 * for a GraphQL error.
 *
 * @param schema - Schema to apply.
 * @param value  - Untrusted input.
 * @param label  - Name used in the error message.
 */
export function parseInput<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || label}: ${issue.message}`)
      .join('; ');
    throw new ValidationError(`Invalid ${label} — ${details}`);
  }
  return result.data;
}
