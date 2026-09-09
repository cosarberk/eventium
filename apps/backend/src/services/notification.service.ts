/**
 * @file Notification service.
 * Manages notification rules and evaluates incoming events against
 * those rules to determine which actions should fire.
 */

import type { PlatformEvent } from '@eventium/shared';
import type { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../utils/index.js';

/** Shape of a condition attached to a notification rule. */
interface RuleCondition {
  /** The event field to evaluate (e.g. "severity"). */
  field: string;
  /** Comparison operator. */
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt';
  /** Value to compare against. */
  value: string | number | boolean;
}

/** Shape of an action triggered when a notification rule matches. */
interface RuleAction {
  /** Action transport (e.g. "email", "slack", "webhook"). */
  type: string;
  /** Transport-specific configuration. */
  config: Record<string, unknown>;
}

/** Input for creating a new notification rule. */
export interface CreateRuleInput {
  name: string;
  eventPattern: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  enabled?: boolean;
}

/** Input for updating an existing notification rule. */
export interface UpdateRuleInput {
  name?: string;
  eventPattern?: string;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
  enabled?: boolean;
}

/**
 * Service responsible for notification rule CRUD and event matching.
 */
export class NotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new notification rule.
   *
   * @param input - Rule creation parameters.
   * @returns The persisted rule record.
   */
  async createRule(input: CreateRuleInput) {
    return this.prisma.notificationRule.create({
      data: {
        name: input.name,
        eventPattern: input.eventPattern,
        conditions: input.conditions as unknown as Prisma.InputJsonValue,
        actions: input.actions as unknown as Prisma.InputJsonValue,
        enabled: input.enabled ?? true,
      },
    });
  }

  /**
   * Update an existing notification rule.
   *
   * @param id    - Rule identifier.
   * @param input - Fields to update.
   * @returns The updated rule record.
   */
  async updateRule(id: string, input: UpdateRuleInput) {
    return this.prisma.notificationRule.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.eventPattern !== undefined && {
          eventPattern: input.eventPattern,
        }),
        ...(input.conditions !== undefined && {
          conditions: input.conditions as unknown as Prisma.InputJsonValue,
        }),
        ...(input.actions !== undefined && {
          actions: input.actions as unknown as Prisma.InputJsonValue,
        }),
        ...(input.enabled !== undefined && { enabled: input.enabled }),
      },
    });
  }

  /**
   * Delete a notification rule by ID.
   *
   * @param id - Rule identifier.
   * @returns The deleted rule record.
   */
  async deleteRule(id: string) {
    return this.prisma.notificationRule.delete({ where: { id } });
  }

  /**
   * Retrieve all notification rules.
   *
   * @returns Array of all rules ordered by creation date descending.
   */
  async findAll() {
    return this.prisma.notificationRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieve a single rule by its ID.
   *
   * @param id - Rule identifier.
   * @returns The rule record or `null`.
   */
  async findById(id: string) {
    return this.prisma.notificationRule.findUnique({ where: { id } });
  }

  /**
   * Evaluate an incoming event against all enabled rules and return
   * the actions that should be executed.
   *
   * @param event - The platform event to evaluate.
   * @returns Array of actions whose owning rules matched.
   */
  async evaluate(event: PlatformEvent): Promise<RuleAction[]> {
    const rules = await this.prisma.notificationRule.findMany({
      where: { enabled: true },
    });

    const matchedActions: RuleAction[] = [];

    for (const rule of rules) {
      if (!this.matchesPattern(event.eventType, rule.eventPattern)) {
        continue;
      }

      const conditions = rule.conditions as unknown as RuleCondition[];
      if (!this.matchesConditions(event, conditions)) {
        continue;
      }

      const actions = rule.actions as unknown as RuleAction[];
      matchedActions.push(...actions);
      logger.info(`Notification rule "${rule.name}" matched event "${event.eventType}".`);
    }

    return matchedActions;
  }

  /**
   * Check whether an event type matches a glob-like pattern.
   * Supports trailing wildcards (e.g. "pipeline.*").
   *
   * @param eventType - Concrete event type string.
   * @param pattern   - Pattern with optional trailing wildcard.
   * @returns `true` when the event type matches.
   */
  private matchesPattern(eventType: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventType.startsWith(prefix);
    }
    return eventType === pattern;
  }

  /**
   * Evaluate a set of conditions against an event. All conditions must
   * pass for the overall check to succeed (AND semantics).
   *
   * @param event      - Platform event.
   * @param conditions - Rule conditions to evaluate.
   * @returns `true` when every condition is satisfied.
   */
  private matchesConditions(event: PlatformEvent, conditions: RuleCondition[]): boolean {
    if (conditions.length === 0) return true;

    const flat: Record<string, unknown> = {
      eventType: event.eventType,
      title: event.title,
      description: event.description,
      severity: event.severity,
      sourceType: event.sourceType,
      pluginInstanceId: event.pluginInstanceId,
      ...event.payload,
    };

    return conditions.every((cond) => {
      const actual = flat[cond.field];
      switch (cond.operator) {
        case 'eq':
          return actual === cond.value;
        case 'neq':
          return actual !== cond.value;
        case 'contains':
          return (
            typeof actual === 'string' &&
            typeof cond.value === 'string' &&
            actual.includes(cond.value)
          );
        case 'gt':
          return typeof actual === 'number' && actual > Number(cond.value);
        case 'lt':
          return typeof actual === 'number' && actual < Number(cond.value);
        default:
          return false;
      }
    });
  }
}
