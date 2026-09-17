/**
 * @fileoverview `.ec` component files — reusable component definitions.
 *
 * A `.ec` file is a saved component: a `componentType` plus its title, options,
 * and slot bindings — but NOT its on-page position. You create one from a block
 * ("save as component") and instance it on any page by dragging it onto the
 * canvas, where it becomes a normal block. The definition is the template; each
 * placed block is an independent instance.
 */
import type { BlockSlot } from '@eventium/shared';
import { getComponent } from '@/components/design/registry';
import type { DashboardBlock } from '@/types';

/** A reusable component definition (the contents of a `.ec` file). */
export interface ComponentDef {
  componentType: string;
  title?: string;
  options?: Record<string, unknown>;
  slots?: Record<string, BlockSlot>;
}

/**
 * Serialize a placed block into a reusable definition. The per-instance `frame`
 * (canvas position/size) is dropped — position belongs to the instance, not the
 * component.
 */
export function serializeBlock(block: DashboardBlock): ComponentDef {
  const { frame: _frame, ...options } = block.options as { frame?: unknown };
  return {
    componentType: block.componentType,
    title: block.title,
    options,
    slots: block.slots,
  };
}

/** Pretty JSON for storing in a `.ec` file's content. */
export function serializeComponentFile(block: DashboardBlock): string {
  return `${JSON.stringify(serializeBlock(block), null, 2)}\n`;
}

/**
 * Parse a `.ec` file's content into a definition, or null when it's empty,
 * malformed, or names an unknown component type (unknown degrades to "can't
 * instance", never a crash).
 */
export function parseComponentDef(content: unknown): ComponentDef | null {
  if (typeof content !== 'string' || !content.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const def = parsed as Partial<ComponentDef>;
  if (typeof def.componentType !== 'string' || !getComponent(def.componentType)) return null;
  return {
    componentType: def.componentType,
    title: typeof def.title === 'string' ? def.title : undefined,
    options: def.options && typeof def.options === 'object' ? def.options : {},
    slots: def.slots && typeof def.slots === 'object' ? def.slots : undefined,
  };
}
