/**
 * @file Public base URL resolver.
 * Determines the externally-reachable base URL that GitLab/Nexus should call
 * for webhooks. Resolution order:
 *   1. `PUBLIC_URL` env (explicit, e.g. a production domain).
 *   2. The bundled Cloudflare quick tunnel, discovered from cloudflared's
 *      metrics endpoint (`TUNNEL_METRICS_URL`) — zero-config for end users.
 * The resolved value is cached and exposed to the API so the UI and webhook
 * registration always use a URL reachable from the public internet.
 */

import { env } from '../config/index.js';
import { logger } from './logger.js';

/** Cached resolved public base URL (without trailing slash), or null. */
let cachedPublicUrl: string | null = env.PUBLIC_URL ?? null;

/** Whether a discovery loop is already running. */
let discovering = false;

/**
 * Returns the currently-known public base URL, or null when not yet resolved.
 *
 * @returns The cached public base URL or null.
 */
export function getPublicBaseUrl(): string | null {
  return cachedPublicUrl;
}

/**
 * Builds the full webhook URL for a plugin from the public base URL.
 *
 * @param pluginId - Plugin identifier (e.g. "gitlab").
 * @returns The absolute webhook URL, or null when no public base URL is known.
 */
export function getWebhookUrl(pluginId: string): string | null {
  return cachedPublicUrl ? `${cachedPublicUrl}/api/webhooks/${pluginId}` : null;
}

/**
 * Query the cloudflared metrics endpoint for the generated quick-tunnel host.
 *
 * @param metricsUrl - Base metrics URL (e.g. http://cloudflared:2000).
 * @returns The `https://<host>` tunnel URL, or null when not yet available.
 */
async function probeTunnel(metricsUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${metricsUrl}/quicktunnel`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { hostname?: string };
    if (data.hostname && data.hostname.length > 0) {
      return `https://${data.hostname.replace(/\/+$/, '')}`;
    }
  } catch {
    // cloudflared not ready yet.
  }
  return null;
}

/**
 * Resolve the public base URL once at startup. When `PUBLIC_URL` is set it is
 * used directly; otherwise the cloudflared tunnel is polled in the background
 * until it reports a hostname. Invokes `onResolved` when a tunnel URL is found
 * (used to re-register webhooks against the fresh URL).
 *
 * @param onResolved - Optional callback invoked with the discovered URL.
 */
export async function resolvePublicBaseUrl(onResolved?: (url: string) => void): Promise<void> {
  if (env.PUBLIC_URL) {
    cachedPublicUrl = env.PUBLIC_URL;
    logger.info(`Public base URL set from PUBLIC_URL: ${cachedPublicUrl}`);
    return;
  }

  if (!env.TUNNEL_METRICS_URL || discovering) {
    return;
  }

  discovering = true;
  const metricsUrl = env.TUNNEL_METRICS_URL;

  // Poll the tunnel in the background for up to ~2 minutes.
  void (async () => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const url = await probeTunnel(metricsUrl);
      if (url) {
        const changed = url !== cachedPublicUrl;
        cachedPublicUrl = url;
        logger.info(`Public base URL discovered from tunnel: ${url}`);
        if (changed) onResolved?.(url);
        discovering = false;
        return;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    discovering = false;
    logger.warn('Could not discover a public tunnel URL; webhooks will need PUBLIC_URL set.');
  })();
}
