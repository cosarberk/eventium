/**
 * @file Page portability service.
 *
 * Exports a page to a portable, instance-agnostic {@link PageSpec} (bindings
 * reference source *types*, not instances) and imports such a spec back into a
 * new page, remapping each referenced source type to a locally chosen instance.
 * This is what lets users share page designs as plain JSON.
 */

import type { BlockSlot, BoundValue, PageSpec } from '@eventium/shared';
import { pageSpecSchema, parseFieldRef } from '@eventium/shared';
import { NotFoundError, ValidationError } from '../utils/index.js';
import type { DashboardService } from './dashboard.service.js';

/** A block's persisted slots map, as stored/returned by Prisma (JSON). */
type SlotsMap = Record<string, BlockSlot>;

/** Raw block row as returned from the dashboard service. */
interface BlockRow {
  componentType: string;
  title: string;
  slots: unknown;
  options: unknown;
  position: unknown;
  size: unknown;
  sortOrder: number;
}

export class PagePortabilityService {
  constructor(private readonly dashboards: DashboardService) {}

  /**
   * Export a page to a portable spec. Strips instance ids from every binding
   * and records the distinct source types the page depends on.
   */
  async exportPage(dashboardId: string): Promise<PageSpec> {
    const dashboard = await this.dashboards.findById(dashboardId);
    if (!dashboard) throw new NotFoundError('Dashboard not found');

    const required = new Set<string>();
    const blocks = (dashboard.blocks as unknown as BlockRow[]).map((block) => {
      const slots = stripInstances(block.slots as SlotsMap, required);
      return {
        id: cryptoId(block.componentType, block.sortOrder),
        componentType: block.componentType,
        title: block.title,
        position: block.position as { x: number; y: number },
        size: block.size as { w: number; h: number },
        slots,
        options: (block.options ?? {}) as Record<string, unknown>,
      };
    });

    const layout = (dashboard.layout ?? {}) as { columns?: number };
    return {
      specVersion: 1,
      name: dashboard.name,
      description: dashboard.description || undefined,
      columns: layout.columns ?? 12,
      blocks,
      requiredSources: [...required],
    };
  }

  /**
   * Import a portable spec into a new page, binding each referenced source type
   * to a concrete instance via `sourceMapping` (sourceType -> instanceId).
   */
  async importPage(rawSpec: unknown, sourceMapping: Record<string, string>) {
    const spec = pageSpecSchema.parse(rawSpec);

    const missing = spec.requiredSources.filter((s) => !sourceMapping[s]);
    if (missing.length > 0) {
      throw new ValidationError(`Missing source mapping for: ${missing.join(', ')}`);
    }

    const blocks = spec.blocks.map((block, index) => ({
      componentType: block.componentType,
      title: block.title,
      slots: applyInstances(block.slots as SlotsMap, sourceMapping),
      options: block.options,
      position: block.position,
      size: block.size,
      sortOrder: index,
    }));

    return this.dashboards.create({
      name: spec.name,
      description: spec.description,
      layout: { columns: spec.columns },
      blocks,
    });
  }
}

/** Remove `instanceId` from every binding and collect referenced source types. */
function stripInstances(slots: SlotsMap, required: Set<string>): SlotsMap {
  return mapBindings(slots, (value) => {
    if (!value.binding) return value;
    const parsed = parseFieldRef(value.binding.ref);
    if (parsed) required.add(parsed.sourceType);
    const { instanceId: _drop, ...rest } = value.binding;
    return { ...value, binding: rest };
  });
}

/** Assign each binding the instance chosen for its source type. */
function applyInstances(slots: SlotsMap, mapping: Record<string, string>): SlotsMap {
  return mapBindings(slots, (value) => {
    if (!value.binding) return value;
    const parsed = parseFieldRef(value.binding.ref);
    const instanceId = parsed ? mapping[parsed.sourceType] : undefined;
    return { ...value, binding: { ...value.binding, instanceId } };
  });
}

/** Apply a transform to every bound value across a slots map. */
function mapBindings(slots: SlotsMap, fn: (value: BoundValue) => BoundValue): SlotsMap {
  const out: SlotsMap = {};
  for (const [key, slot] of Object.entries(slots)) {
    out[key] = { values: slot.values.map(fn) };
  }
  return out;
}

/** A stable-enough block id for an exported spec (no randomness at rest). */
function cryptoId(componentType: string, order: number): string {
  return `${componentType}-${order}`;
}
