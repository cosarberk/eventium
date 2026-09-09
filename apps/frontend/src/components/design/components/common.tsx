/**
 * @fileoverview Shared presentational helpers for design-layer component
 * renderers. Keeps the individual renderers focused on layout by centralizing
 * empty-state rendering, slot access, value extraction, and option coercion.
 */
import type { ReactNode } from 'react';
import type { BoundValue, ResolvedBinding } from '@/types';
import type { BlockData, ResolvedSlotValue } from '../render-types';

/** A centered, muted hint shown when a component has nothing to render. */
export function EmptyState({ label }: { label: string }): ReactNode {
  return (
    <div className="flex h-full w-full items-center justify-center px-3 py-8 text-center text-sm opacity-40">
      {label}
    </div>
  );
}

/** Read a slot's ordered bound values, tolerant of an unbound slot. */
export function slotValues(data: BlockData, key: string): ResolvedSlotValue[] {
  return data[key] ?? [];
}

/**
 * The scalar a bound value effectively yields: resolved live data when present,
 * otherwise its static literal. Returns `null` for errored or empty bindings.
 */
export function effectiveScalar(
  bv: BoundValue,
  resolved: ResolvedBinding | null,
): string | number | boolean | null {
  if (resolved) {
    if (resolved.error !== undefined) return null;
    return resolved.scalar ?? null;
  }
  return bv.staticValue ?? null;
}

/** The list a bound value yields, or an empty list for errored/unresolved ones. */
export function effectiveList(
  resolved: ResolvedBinding | null,
): ReadonlyArray<string | number | boolean | null> {
  if (!resolved || resolved.error !== undefined) return [];
  return resolved.list ?? [];
}

/** Read a numeric block option, falling back when absent or non-finite. */
export function optionNumber(
  options: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = options[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Read a string block option, falling back when absent or non-string. */
export function optionString(
  options: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = options[key];
  return typeof value === 'string' ? value : fallback;
}
