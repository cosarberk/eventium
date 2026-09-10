/**
 * @fileoverview Shared REST helper.
 * One request path so every call sends the auth cookie and surfaces the
 * backend's uniform `{ error: string }` envelope as an Error the UI can show.
 */
import { config } from '@/config';

/** JSON content-type header for requests carrying a body. */
const JSON_HEADERS: Record<string, string> = { 'Content-Type': 'application/json' };

/** Pull a human-readable message out of a parsed error body. */
function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const b = body as { error?: unknown; message?: unknown };
    if (typeof b.error === 'string') return b.error;
    if (typeof b.message === 'string') return b.message;
  }
  return fallback;
}

/**
 * Normalize any thrown value into a display message. Used by the global
 * query/mutation error handlers so every failure reaches a toast.
 *
 * @param err      - The caught value.
 * @param fallback - Message when nothing better can be extracted.
 */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

/**
 * Perform a JSON REST request against the API.
 * Sends the session cookie and, on a non-2xx response, throws an Error whose
 * message is the backend's `error` field.
 *
 * @param path     - Path under the API base (e.g. `/users`).
 * @param options  - Fetch options; a JSON body sets the content-type header.
 * @param fallback - Error message used when the body carries none.
 * @returns The parsed JSON response body.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  fallback = 'Request failed',
): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? JSON_HEADERS : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new Error(messageFrom(body, fallback));
  }
  return body as T;
}
