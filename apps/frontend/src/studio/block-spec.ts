/**
 * @fileoverview Block ↔ spec codec — the bridge that makes Code a live view of
 * the same block the Designer edits.
 *
 * A block is the single source of truth. Its declarative "spec" (type, title,
 * options, bindings) is what the Code panel shows and edits for config-driven
 * components; editing the spec writes back to the block, and editing the block
 * regenerates the spec. Custom HTML/React blocks keep raw code (their own source)
 * instead of a spec.
 */
import type { BlockSlot } from '@eventium/shared';
import type { DashboardBlock } from '@/types';

/** The declarative, round-trippable definition of a block. */
export interface BlockSpec {
  type: string;
  title: string;
  options: Record<string, unknown>;
  slots: Record<string, BlockSlot>;
}

/** Project a block to its spec. */
export function blockToSpec(block: DashboardBlock): BlockSpec {
  return {
    type: block.componentType,
    title: block.title,
    options: block.options,
    slots: block.slots,
  };
}

/** Serialize a block to pretty spec JSON (what the Code panel displays). */
export function specToJson(block: DashboardBlock): string {
  return JSON.stringify(blockToSpec(block), null, 2);
}

/** Parse edited spec JSON back into a validated {@link BlockSpec}. */
export function parseSpec(
  json: string,
): { ok: true; spec: BlockSpec } | { ok: false; error: string } {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (typeof value !== 'object' || value === null) {
    return { ok: false, error: 'Bir JSON nesnesi bekleniyor.' };
  }
  const v = value as Record<string, unknown>;
  const options = v.options;
  const slots = v.slots;
  if (options !== undefined && (typeof options !== 'object' || options === null)) {
    return { ok: false, error: '"options" bir nesne olmalı.' };
  }
  if (slots !== undefined && (typeof slots !== 'object' || slots === null)) {
    return { ok: false, error: '"slots" bir nesne olmalı.' };
  }
  return {
    ok: true,
    spec: {
      type: typeof v.type === 'string' ? v.type : '',
      title: typeof v.title === 'string' ? v.title : '',
      options: (options as Record<string, unknown>) ?? {},
      slots: (slots as Record<string, BlockSlot>) ?? {},
    },
  };
}
