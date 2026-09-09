/**
 * @fileoverview Zod schemas for bindings and page documents.
 *
 * Used to validate page create/update payloads on the backend and, critically,
 * to validate untrusted {@link PageSpec} JSON on import.
 */

import { z } from 'zod';

const compareOpSchema = z.enum(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains']);
const panelSeveritySchema = z.enum(['neutral', 'info', 'success', 'warning', 'error', 'critical']);

/** `sourceType:entity.field` address. */
const fieldRefStringSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*:[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/i,
    'Binding ref must be sourceType:entity.field',
  );

export const bindingFilterSchema = z.object({
  field: z.string().min(1),
  op: compareOpSchema,
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const bindingSchema = z.object({
  ref: fieldRefStringSchema,
  instanceId: z.string().min(1).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  filters: z.array(bindingFilterSchema).optional(),
  aggregate: z.enum(['count', 'sum', 'avg', 'min', 'max', 'first', 'latest']).optional(),
  xField: z.string().min(1).optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

export const colorRuleSchema = z.object({
  op: compareOpSchema,
  value: z.union([z.string(), z.number()]),
  severity: panelSeveritySchema,
});

export const valueFormatSchema = z.object({
  kind: z
    .enum(['number', 'date', 'datetime', 'relative', 'duration', 'bytes', 'percent', 'text'])
    .optional(),
  decimals: z.number().int().min(0).max(10).optional(),
  prefix: z.string().max(16).optional(),
  suffix: z.string().max(16).optional(),
});

export const boundValueSchema = z.object({
  id: z.string().min(1),
  binding: bindingSchema.optional(),
  staticValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  label: z.string().max(128).optional(),
  rules: z.array(colorRuleSchema).optional(),
  format: valueFormatSchema.optional(),
});

export const blockSlotSchema = z.object({
  values: z.array(boundValueSchema),
});

export const pageBlockSchema = z.object({
  id: z.string().min(1),
  componentType: z.string().min(1),
  title: z.string().max(128),
  position: z.object({ x: z.number().int().min(0), y: z.number().int().min(0) }),
  size: z.object({ w: z.number().int().min(1).max(12), h: z.number().int().min(1).max(48) }),
  slots: z.record(z.string(), blockSlotSchema),
  options: z.record(z.string(), z.unknown()),
});

/** A portable page definition, validated on import. */
export const pageSpecSchema = z.object({
  specVersion: z.literal(1),
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  columns: z.number().int().min(1).max(24),
  blocks: z.array(pageBlockSchema).max(100),
  requiredSources: z.array(z.string().min(1)),
});

export type BindingSchema = z.infer<typeof bindingSchema>;
export type PageBlockSchema = z.infer<typeof pageBlockSchema>;
export type PageSpecSchema = z.infer<typeof pageSpecSchema>;
