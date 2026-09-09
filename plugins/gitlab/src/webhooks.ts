/**
 * @fileoverview GitLab webhook self-management.
 *
 * Implements {@link WebhookTargetProvider} so the platform can list a token's
 * projects (flagging which carry the Eventium webhook) and reconcile the
 * monitored set — installing/removing Eventium's single webhook URL per project
 * via the API, so a user never edits each project's Settings → Webhooks by hand.
 */

import type { DataSourceContext, WebhookTarget, WebhookTargetProvider } from '@eventium/plugin-sdk';
import { GitLabApiClient } from './api.js';

/** Maximum number of projects scanned for webhook management. */
const MAX_PROJECTS = 100;

/** Build an API client from an instance's configuration. */
function clientFrom(ctx: DataSourceContext): GitLabApiClient {
  return new GitLabApiClient({
    url: ctx.config.url as string,
    token: ctx.config.token as string,
  });
}

/**
 * Extract the path portion of the webhook URL (e.g. `/api/webhooks/gitlab`).
 * Hooks are matched by this path, not the full URL, so previously-installed
 * Eventium hooks remain recognizable when the public base URL changes (e.g. a
 * fresh tunnel after restart).
 */
function webhookPath(webhookUrl: string): string {
  try {
    return new URL(webhookUrl).pathname;
  } catch {
    return webhookUrl;
  }
}

/** Whether a hook URL belongs to Eventium (same webhook path, any host). */
function isEventiumHook(hookUrl: string, path: string): boolean {
  try {
    return new URL(hookUrl).pathname === path;
  } catch {
    return false;
  }
}

/**
 * List every accessible project as a {@link WebhookTarget}, flagging which
 * carry the Eventium webhook (matched by path).
 */
async function list(ctx: DataSourceContext, webhookUrl: string): Promise<WebhookTarget[]> {
  const client = clientFrom(ctx);
  const path = webhookPath(webhookUrl);
  const projects = await client.getProjects({ perPage: MAX_PROJECTS });

  const targets: WebhookTarget[] = [];
  for (const project of projects) {
    let monitored = false;
    try {
      const hooks = await client.getProjectHooks(project.id);
      monitored = hooks.some((h) => isEventiumHook(h.url, path));
    } catch {
      // Insufficient permission to read hooks; treat as unmonitored.
    }
    targets.push({
      id: String(project.id),
      name: project.name,
      fullPath: project.path_with_namespace,
      monitored,
    });
  }
  return targets;
}

/**
 * Reconcile the monitored set to exactly `targetIds`: install the Eventium
 * webhook on newly-selected projects, remove it from deselected ones, and
 * replace stale hooks (e.g. pointing at an old tunnel URL). Idempotent.
 *
 * @returns The refreshed target list.
 */
async function sync(
  ctx: DataSourceContext,
  targetIds: readonly string[],
  webhookUrl: string,
): Promise<WebhookTarget[]> {
  const client = clientFrom(ctx);
  const path = webhookPath(webhookUrl);
  const secret = ctx.config.webhookSecret as string | undefined;
  const desired = new Set(targetIds.map((id) => Number(id)));
  const projects = await client.getProjects({ perPage: MAX_PROJECTS });

  for (const project of projects) {
    let hooks: readonly { id: number; url: string }[] = [];
    try {
      hooks = await client.getProjectHooks(project.id);
    } catch {
      continue; // Cannot manage hooks without read access.
    }
    const ours = hooks.filter((h) => isEventiumHook(h.url, path));

    if (desired.has(project.id)) {
      const upToDate = ours.some((h) => h.url === webhookUrl);
      // Remove any stale Eventium hooks (e.g. pointing at an old tunnel URL).
      for (const hook of ours) {
        if (hook.url !== webhookUrl) {
          await client.deleteProjectHook(project.id, hook.id);
        }
      }
      if (!upToDate) {
        await client.createProjectHook(project.id, { url: webhookUrl, token: secret });
      }
    } else {
      // Not selected — remove every Eventium hook from this project.
      for (const hook of ours) {
        await client.deleteProjectHook(project.id, hook.id);
      }
    }
  }

  return list(ctx, webhookUrl);
}

/** Webhook self-management for the GitLab data source. */
export const webhookTargets: WebhookTargetProvider = { list, sync };
