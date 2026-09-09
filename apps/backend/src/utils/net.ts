/**
 * @file Outbound URL safety checks (SSRF protection).
 *
 * Notification rules let a user name an arbitrary URL for the platform to POST
 * to. Without a guard that is a server-side request forgery primitive: the
 * backend sits inside the cluster and can reach databases, the Kubernetes API,
 * and cloud metadata endpoints that the user cannot. Every outbound URL is
 * therefore resolved and checked against private address space before use.
 */

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { env } from '../config/index.js';

/** Protocols we are willing to call out on. */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Whether an IPv4 address belongs to a range that must never be reachable from
 * a user-supplied URL (loopback, RFC1918, link-local, CGNAT, multicast).
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return true;
  }
  const [a, b] = parts;

  if (a === 0 || a === 127) return true; // this-host / loopback
  if (a === 10) return true; // RFC1918
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a >= 224) return true; // multicast + reserved
  return false;
}

/** Whether an IPv6 address is loopback, unique-local, link-local, or unspecified. */
function isPrivateIPv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === '::1' || addr === '::') return true;

  // IPv4-mapped (::ffff:10.0.0.1) inherits the IPv4 rules.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (mapped) return isPrivateIPv4(mapped[1]);

  const head = addr.split(':')[0];
  const prefix = Number.parseInt(head.padEnd(4, '0'), 16);
  if (Number.isNaN(prefix)) return true;

  if ((prefix & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((prefix & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((prefix & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

/** Whether a literal IP address is in private/reserved space. */
function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true;
}

/**
 * Validate that a user-supplied URL is a plain HTTP(S) endpoint on a public
 * address, resolving its hostname to catch names that point inward.
 *
 * @param rawUrl - The URL to validate.
 * @returns The parsed URL when it is safe to call.
 * @throws When the scheme is unsupported or the target resolves into private space.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: "${rawUrl}"`);
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error(`Unsupported protocol "${url.protocol}" — only http and https are allowed.`);
  }

  if (env.ALLOW_PRIVATE_NETWORK_WEBHOOKS) {
    return url;
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');

  if (isIP(host)) {
    if (isPrivateAddress(host)) {
      throw new Error(`Refusing to call private address "${host}".`);
    }
    return url;
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new Error(`Could not resolve host "${host}".`);
  }

  if (records.length === 0) {
    throw new Error(`Host "${host}" did not resolve to any address.`);
  }

  for (const record of records) {
    if (isPrivateAddress(record.address)) {
      throw new Error(
        `Host "${host}" resolves to private address "${record.address}"; refusing to call it. ` +
          'Set ALLOW_PRIVATE_NETWORK_WEBHOOKS=true to permit internal targets.',
      );
    }
  }

  return url;
}
