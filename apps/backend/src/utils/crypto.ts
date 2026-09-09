/**
 * @file Symmetric encryption helpers for secrets held at rest.
 *
 * Data-source instances store credentials (API tokens, webhook secrets) in their
 * `config` JSON. Those values are encrypted with AES-256-GCM before they touch
 * the database and decrypted only when a plugin call needs them.
 *
 * Format: `enc:v1:<iv-b64>:<tag-b64>:<ciphertext-b64>`. Values that do not carry
 * that prefix are treated as plaintext, so a database written by an earlier
 * version keeps working and is upgraded on the next write.
 */

import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { SECRET_MASK } from '@eventium/shared';
import { env } from '../config/index.js';
import { logger } from './logger.js';

/** Prefix that marks an encrypted value. */
const PREFIX = 'enc:v1';

/** AES-GCM initialisation vector length in bytes. */
const IV_BYTES = 12;

/** Placeholder returned instead of a secret value in API responses. */
export { SECRET_MASK };

/**
 * Derive the 32-byte content key. `ENCRYPTION_KEY` is preferred; falling back to
 * `JWT_SECRET` keeps zero-config installs working but ties credential
 * decryption to the JWT secret's lifetime.
 */
function deriveKey(): Buffer {
  const source = env.ENCRYPTION_KEY ?? env.JWT_SECRET;
  if (!env.ENCRYPTION_KEY) {
    logger.warn(
      'ENCRYPTION_KEY is not set — deriving the secret-encryption key from JWT_SECRET. ' +
        'Rotating JWT_SECRET will make stored data-source credentials unreadable.',
    );
  }
  return Buffer.from(hkdfSync('sha256', source, 'eventium-secret-salt', 'eventium:config:v1', 32));
}

/** Lazily derived content key (module-level so HKDF runs once). */
let cachedKey: Buffer | null = null;

/** Return the derived content key, computing it on first use. */
function key(): Buffer {
  if (!cachedKey) cachedKey = deriveKey();
  return cachedKey;
}

/**
 * Whether a value carries the encrypted-envelope prefix.
 *
 * @param value - Candidate value.
 */
export function isEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(`${PREFIX}:`);
}

/**
 * Encrypt a plaintext string into a self-describing envelope.
 *
 * @param plain - Value to protect.
 * @returns The `enc:v1:…` envelope.
 */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypt an envelope produced by {@link encryptSecret}. Plaintext input is
 * returned unchanged so pre-encryption rows stay readable.
 *
 * @param value - Envelope or plaintext value.
 * @returns The plaintext value.
 * @throws When the envelope is malformed or fails authentication.
 */
export function decryptSecret(value: string): string {
  if (!isEncrypted(value)) return value;

  const parts = value.split(':');
  if (parts.length !== 5) {
    throw new Error('Malformed encrypted value');
  }

  const [, , ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Constant-time string comparison, safe for secret material.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` when both are byte-identical.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
