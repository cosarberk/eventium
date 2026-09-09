/**
 * @fileoverview Service layer for notification rule management.
 * Handles CRUD operations for notification rules via urql.
 */
import { urqlClient } from '@/api/client';
import {
  CREATE_NOTIFICATION_RULE,
  DELETE_NOTIFICATION_RULE,
  GET_NOTIFICATION_RULES,
  UPDATE_NOTIFICATION_RULE,
} from '@/api/graphql';
import type { NotificationRule } from '@/types';

/**
 * Fetches all notification rules.
 * @returns Array of notification rule configurations
 */
export async function fetchNotificationRules(): Promise<NotificationRule[]> {
  const result = await urqlClient.query(GET_NOTIFICATION_RULES, {}).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.notificationRules as NotificationRule[];
}

/**
 * Creates a new notification rule.
 * @param input - The notification rule data
 * @returns The created notification rule
 */
export async function createNotificationRule(input: {
  name: string;
  eventPattern: string;
  conditions?: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  enabled?: boolean;
}): Promise<NotificationRule> {
  const result = await urqlClient.mutation(CREATE_NOTIFICATION_RULE, { input }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.createNotificationRule as NotificationRule;
}

/**
 * Updates an existing notification rule.
 * @param id - The notification rule ID
 * @param input - The updated fields
 * @returns The updated notification rule
 */
export async function updateNotificationRule(
  id: string,
  input: {
    name?: string;
    eventPattern?: string;
    conditions?: Record<string, unknown>[];
    actions?: Record<string, unknown>[];
    enabled?: boolean;
  },
): Promise<NotificationRule> {
  const result = await urqlClient.mutation(UPDATE_NOTIFICATION_RULE, { id, input }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.updateNotificationRule as NotificationRule;
}

/**
 * Deletes a notification rule by its ID.
 * @param id - The notification rule ID
 * @returns The ID of the deleted rule
 */
export async function deleteNotificationRule(id: string): Promise<{ id: string }> {
  const result = await urqlClient.mutation(DELETE_NOTIFICATION_RULE, { id }).toPromise();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data.deleteNotificationRule as { id: string };
}
