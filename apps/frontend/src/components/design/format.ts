/**
 * @fileoverview Value formatting and conditional-color evaluation.
 *
 * Formatting and coloring are design concerns applied uniformly by every
 * renderer — not something a data source decides. `evalColorRules` implements
 * the "value under 40 turns red" mechanism.
 */

import type { ColorRule, CompareOp, PanelSeverity, ValueFormat } from '@/types';

/** Format a resolved scalar into display text per the block's {@link ValueFormat}. */
export function formatValue(value: unknown, format?: ValueFormat): string {
  if (value === null || value === undefined) return '—';
  const kind = format?.kind;
  let out: string;

  switch (kind) {
    case 'number':
      out = formatNumber(value, format?.decimals);
      break;
    case 'percent':
      out = `${formatNumber(value, format?.decimals ?? 0)}%`;
      break;
    case 'bytes':
      out = formatBytes(toNumber(value));
      break;
    case 'duration':
      out = formatDuration(toNumber(value));
      break;
    case 'date':
      out = formatDate(value, false);
      break;
    case 'datetime':
      out = formatDate(value, true);
      break;
    case 'relative':
      out = formatRelative(value);
      break;
    default:
      out = String(value);
  }
  return `${format?.prefix ?? ''}${out}${format?.suffix ?? ''}`;
}

/**
 * Evaluate ordered color rules against a value; first match wins. Falls back to
 * the provided severity (or `neutral`) when no rule matches.
 */
export function evalColorRules(
  value: unknown,
  rules: readonly ColorRule[] | undefined,
  fallback: PanelSeverity = 'neutral',
): PanelSeverity {
  if (!rules?.length) return fallback;
  for (const rule of rules) {
    if (compare(value, rule.op, rule.value)) return rule.severity;
  }
  return fallback;
}

/** Coerce an unknown to a finite number (0 on failure). */
export function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function compare(actual: unknown, op: CompareOp, expected: string | number): boolean {
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

function formatNumber(value: unknown, decimals?: number): string {
  const n = toNumber(value);
  return decimals === undefined ? n.toLocaleString() : n.toFixed(decimals);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatDate(value: unknown, withTime: boolean): string {
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return withTime ? d.toLocaleString() : d.toLocaleDateString();
}

function formatRelative(value: unknown): string {
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
