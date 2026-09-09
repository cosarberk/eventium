/**
 * @fileoverview Notification-related type definitions for the Eventium platform.
 * Covers notification rules, conditions, actions, and notification instances.
 */

import type { EventSeverity } from './event.js';

/**
 * Comparison operators available for notification conditions.
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'regex';

/**
 * A single condition that must be satisfied for a notification rule to fire.
 */
export interface NotificationCondition {
  /** The event field to evaluate (supports dot-notation for nested metadata). */
  readonly field: string;
  /** Comparison operator to apply. */
  readonly operator: ConditionOperator;
  /** Value to compare the field against. */
  readonly value: string | number | boolean;
}

/**
 * Delivery channel for a notification action.
 */
export type NotificationChannel = 'email' | 'slack' | 'webhook' | 'in_app';

/**
 * An action to perform when a notification rule fires.
 */
export interface NotificationAction {
  /** Delivery channel for this action. */
  readonly channel: NotificationChannel;
  /** Channel-specific target (e.g. email address, Slack channel id, webhook URL). */
  readonly target: string;
  /** Optional Handlebars template for the notification message body. */
  readonly template?: string;
}

/**
 * A user-defined rule that triggers notifications when matching events arrive.
 */
export interface NotificationRule {
  /** Unique rule identifier (UUID v4). */
  readonly id: string;
  /** Owner's user identifier. */
  readonly userId: string;
  /** Human-readable rule name. */
  readonly name: string;
  /** Optional description of what this rule monitors. */
  readonly description?: string;
  /** Whether the rule is currently active. */
  readonly enabled: boolean;
  /** Event type ids this rule listens to. An empty array means all event types. */
  readonly eventTypeIds: readonly string[];
  /** Minimum severity an event must have to be considered. */
  readonly minSeverity: EventSeverity;
  /** All conditions must be met for the rule to fire (AND logic). */
  readonly conditions: readonly NotificationCondition[];
  /** Actions to execute when the rule fires. */
  readonly actions: readonly NotificationAction[];
  /** Minimum seconds between consecutive firings to prevent spam. */
  readonly cooldownSeconds: number;
  /** ISO-8601 timestamp of creation. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of last modification. */
  readonly updatedAt: string;
}

/**
 * Delivery status of a notification instance.
 */
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

/**
 * A concrete notification instance generated when a rule fires.
 */
export interface Notification {
  /** Unique notification identifier (UUID v4). */
  readonly id: string;
  /** Reference to the NotificationRule that triggered this notification. */
  readonly ruleId: string;
  /** Reference to the Event that triggered this notification. */
  readonly eventId: string;
  /** Delivery channel used. */
  readonly channel: NotificationChannel;
  /** Resolved target address. */
  readonly target: string;
  /** Rendered notification message. */
  readonly message: string;
  /** Current delivery status. */
  readonly status: NotificationStatus;
  /** ISO-8601 timestamp of when the notification was created. */
  readonly createdAt: string;
  /** ISO-8601 timestamp of when the notification was sent, if applicable. */
  readonly sentAt?: string;
}
