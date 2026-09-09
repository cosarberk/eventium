/**
 * @file Binding resolver.
 *
 * Turns a design-layer {@link Binding} into a {@link ResolvedBinding} whose shape
 * matches the slot it feeds. It parses the portable `sourceType:entity.field`
 * ref, picks the target instance, runs the resource query, applies row filters,
 * and reduces/reshapes the chosen field into a scalar, series, or list.
 *
 * Each binding resolves independently — this is what makes a single component
 * able to mix fields from different sources (a `gitlab:` column beside an
 * `artifactory:` column). List slots (e.g. table columns) are index-aligned on
 * the client, not join-merged, in this version.
 */

import type {
  Aggregation,
  Binding,
  BindingFilter,
  CompareOp,
  ResolvedBinding,
} from '@eventium/shared';
import { parseFieldRef } from '@eventium/shared';
import type { DataSourceService } from './datasource.service.js';

export class BindingResolver {
  constructor(private readonly dataSources: DataSourceService) {}

  /** Resolve many bindings concurrently; failures surface as `error` entries. */
  async resolveMany(bindings: readonly Binding[]): Promise<ResolvedBinding[]> {
    return Promise.all(bindings.map((b) => this.resolveOne(b)));
  }

  /** Resolve a single binding, never throwing — errors are returned in-band. */
  async resolveOne(binding: Binding): Promise<ResolvedBinding> {
    const shape = binding.xField ? 'series' : binding.aggregate ? 'scalar' : 'list';
    try {
      const parsed = parseFieldRef(binding.ref);
      if (!parsed) throw new Error(`Malformed binding ref "${binding.ref}"`);

      const instanceId =
        binding.instanceId ?? (await this.dataSources.findDefaultInstanceId(parsed.sourceType));
      if (!instanceId) {
        throw new Error(`No installed instance for source "${parsed.sourceType}"`);
      }

      const { rows } = await this.dataSources.queryResource(instanceId, {
        entity: parsed.entity,
        params: binding.params,
        limit: binding.limit,
      });

      const filtered = binding.filters?.length
        ? rows.filter((row) => this.matchesFilters(row, binding.filters ?? []))
        : rows;

      return this.shapeResult(binding, parsed.field, filtered);
    } catch (err) {
      return { ref: binding.ref, shape, error: (err as Error).message };
    }
  }

  /** Reshape filtered rows into the binding's target shape. */
  private shapeResult(
    binding: Binding,
    field: string,
    rows: ReadonlyArray<Record<string, unknown>>,
  ): ResolvedBinding {
    if (binding.xField) {
      const xField = binding.xField;
      const series = rows.map((row) => ({
        x: row[xField] as string | number,
        y: toNumber(row[field]),
      }));
      return { ref: binding.ref, shape: 'series', series };
    }

    if (binding.aggregate) {
      return {
        ref: binding.ref,
        shape: 'scalar',
        scalar: this.aggregate(binding.aggregate, rows, field),
      };
    }

    const list = rows.map((row) => row[field] as string | number | boolean | null);
    return { ref: binding.ref, shape: 'list', list };
  }

  /** Reduce a field over rows into a single scalar. */
  private aggregate(
    op: Aggregation,
    rows: ReadonlyArray<Record<string, unknown>>,
    field: string,
  ): string | number | boolean | null {
    if (op === 'count') return rows.length;
    if (rows.length === 0) return null;
    if (op === 'first') return rows[0][field] as string | number | boolean | null;
    if (op === 'latest') return rows[rows.length - 1][field] as string | number | boolean | null;

    const nums = rows.map((r) => toNumber(r[field]));
    switch (op) {
      case 'sum':
        return nums.reduce((a, b) => a + b, 0);
      case 'avg':
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      case 'min':
        return Math.min(...nums);
      case 'max':
        return Math.max(...nums);
    }
  }

  /** All filters must hold (AND semantics). */
  private matchesFilters(row: Record<string, unknown>, filters: readonly BindingFilter[]): boolean {
    return filters.every((filter) => compare(row[filter.field], filter.op, filter.value));
  }
}

/** Coerce an unknown to a finite number, defaulting to 0. */
function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Evaluate a comparison operator between a row value and a target. */
function compare(actual: unknown, op: CompareOp, expected: string | number | boolean): boolean {
  switch (op) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'lt':
      return toNumber(actual) < toNumber(expected);
    case 'lte':
      return toNumber(actual) <= toNumber(expected);
    case 'gt':
      return toNumber(actual) > toNumber(expected);
    case 'gte':
      return toNumber(actual) >= toNumber(expected);
    case 'contains':
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
  }
}
