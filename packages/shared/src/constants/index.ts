/**
 * @fileoverview Shared constants used across the Eventium platform.
 */

import type { EventSeverity } from '../types/event.js';

/** Event severity levels from least to most critical. */
export const EVENT_SEVERITY_LEVELS = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const;

/** Numeric weight per severity, for sorting and threshold checks. */
export const EVENT_SEVERITY_WEIGHTS: Record<EventSeverity, number> = {
  INFO: 0,
  WARNING: 1,
  ERROR: 2,
  CRITICAL: 3,
} as const;

/** Default grid configuration for a design-layer page. */
export const PAGE_DEFAULTS = {
  /** Standard number of grid columns. */
  COLUMNS: 12,
  /** Default row height in pixels. */
  ROW_HEIGHT: 48,
  /** Maximum number of blocks per page. */
  MAX_BLOCKS: 100,
} as const;

/**
 * Placeholder the API returns in place of a stored secret.
 *
 * Data-source credentials are encrypted at rest and never sent back to a
 * client. Submitting a config field with this exact value means "leave the
 * stored secret as it is", which is what lets the config form round-trip
 * without ever seeing the real token.
 */
export const SECRET_MASK = '••••••••';

/** Config keys the platform manages internally and hides from config forms. */
export const INTERNAL_CONFIG_PREFIX = '_';

/** Notification channel identifiers. */
export const NOTIFICATION_CHANNELS = ['email', 'slack', 'webhook', 'in_app'] as const;

/** Condition operators available for notification rules. */
export const CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'greater_than',
  'less_than',
  'regex',
] as const;

/** Default cooldown in seconds between repeated notification firings. */
export const DEFAULT_NOTIFICATION_COOLDOWN_SECONDS = 300;

/** Maximum character lengths for common fields, for UI hints and validation. */
export const FIELD_LIMITS = {
  EVENT_TITLE: 256,
  EVENT_DESCRIPTION: 4096,
  PLUGIN_NAME: 128,
  PLUGIN_DESCRIPTION: 1024,
  PAGE_NAME: 128,
  BLOCK_TITLE: 128,
  RULE_NAME: 128,
} as const;
