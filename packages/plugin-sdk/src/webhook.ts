/**
 * @fileoverview Webhook helpers for plugin authors.
 */

import { timingSafeEqual } from 'node:crypto';

/**
 * Thrown by a webhook handler when the request could not be authenticated.
 *
 * The platform treats this differently from any other failure: an unauthenticated
 * delivery is refused with a 4xx, while a delivery that authenticated but could
 * not be parsed is still acknowledged. That distinction matters because GitLab
 * and Nexus disable a webhook after repeated error responses — a parser bug
 * would otherwise silently switch off event delivery.
 */
export class WebhookAuthError extends Error {
  constructor(message = 'Webhook authentication failed') {
    super(message);
    this.name = 'WebhookAuthError';
  }
}

/**
 * Whether a thrown value signals a failed webhook authentication.
 *
 * Uses the marker name rather than `instanceof` so a plugin bundling its own
 * copy of the SDK is still recognised.
 *
 * @param err - The thrown value.
 */
export function isWebhookAuthError(err: unknown): boolean {
  return err instanceof Error && err.name === 'WebhookAuthError';
}

/**
 * Case-insensitive header lookup over a raw header map.
 */
export function readHeader(
  headers: Readonly<Record<string, string | undefined>>,
  name: string,
): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value;
  }
  return undefined;
}

/**
 * Constant-time comparison of two secrets. Comparing with `===` leaks the length
 * of the matching prefix through timing, which is enough to recover a shared
 * secret over many requests.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` when both values are byte-identical.
 */
export function secretsMatch(a: string | undefined, b: string | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify a shared webhook secret against any of the candidate header names.
 * Returns `true` when no secret is configured (verification is opt-in — the
 * platform can require one globally via `WEBHOOK_REQUIRE_SECRET`), or when one
 * of the candidate headers matches the configured secret in constant time.
 */
export function verifyWebhookSecret(
  headers: Readonly<Record<string, string | undefined>>,
  secret: string | undefined,
  candidateHeaderNames: readonly string[],
): boolean {
  if (!secret) return true;
  return candidateHeaderNames.some((name) => secretsMatch(readHeader(headers, name), secret));
}
