/**
 * @fileoverview Zod schemas for the data-source contract: field types, capability
 * descriptors, and plugin manifests. Used to validate a plugin's declared surface
 * at discovery time and to validate manifest.json files.
 */

import { z } from 'zod';
import { streamEventDescriptorSchema } from './event.schema.js';

/** A field's primitive kind plus refinements. */
export const fieldTypeSchema = z.object({
  kind: z.enum(['string', 'number', 'boolean', 'datetime', 'duration', 'enum', 'url', 'json']),
  enumValues: z.array(z.string()).optional(),
  unit: z.string().optional(),
  higherIsBetter: z.boolean().optional(),
});

/** A single queryable field on an entity. */
export const fieldDescriptorSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/i, 'Field key must be an identifier'),
  label: z.string().min(1).max(128),
  type: fieldTypeSchema,
  description: z.string().max(512).optional(),
});

/** A parameter an entity query accepts. */
export const entityParamSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1).max(128),
  type: fieldTypeSchema,
  required: z.boolean(),
});

/** A queryable entity. */
export const entityDescriptorSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/i, 'Entity key must be an identifier'),
  label: z.string().min(1).max(128),
  fields: z.array(fieldDescriptorSchema).min(1),
  description: z.string().max(512).optional(),
  params: z.array(entityParamSchema).optional(),
});

/** A data source's complete capability surface. */
export const capabilityDescriptorSchema = z.object({
  entities: z.array(entityDescriptorSchema),
  events: z.array(streamEventDescriptorSchema),
});

/** A configuration field shown in a source's install form. */
export const pluginConfigFieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Key must be a valid identifier'),
  label: z.string().min(1).max(128),
  type: z.enum(['string', 'number', 'boolean', 'select', 'secret']),
  required: z.boolean(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  options: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).optional(),
  description: z.string().max(512).optional(),
  placeholder: z.string().optional(),
});

/**
 * A data-source plugin manifest (manifest.json). Identity + config + the entry
 * module that exports `capabilities`, `queryResource`, and optionally
 * `handleWebhook`/`fetchMetadata`/webhook-management functions.
 */
export const pluginManifestSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9-]*$/, 'Plugin id must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(128),
  description: z.string().min(1).max(1024),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must follow semver format'),
  author: z.string().min(1).max(128),
  icon: z.string().optional(),
  main: z.string().min(1),
  configFields: z.array(pluginConfigFieldSchema),
});

export type FieldTypeSchema = z.infer<typeof fieldTypeSchema>;
export type FieldDescriptorSchema = z.infer<typeof fieldDescriptorSchema>;
export type EntityDescriptorSchema = z.infer<typeof entityDescriptorSchema>;
export type CapabilityDescriptorSchema = z.infer<typeof capabilityDescriptorSchema>;
export type PluginConfigFieldSchema = z.infer<typeof pluginConfigFieldSchema>;
export type PluginManifestSchema = z.infer<typeof pluginManifestSchema>;
