/**
 * @file Environment configuration module.
 * Loads and validates all environment variables through a Zod schema,
 * ensuring the application fails fast on misconfiguration.
 *
 * Security-sensitive values (JWT_SECRET, ENCRYPTION_KEY) have no defaults on
 * purpose — a shipped default secret is the same as no secret at all.
 */

import { z } from 'zod';

/** Parse a boolean-ish env string ("true"/"1"/"yes") with a fallback. */
const boolFromEnv = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v.trim().length === 0) return defaultValue;
      return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase());
    });

/** Trim a string env var and collapse empty values to `undefined`. */
const optionalTrimmed = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim().replace(/\/+$/, '') : undefined));

/** Zod schema that defines every expected environment variable. */
const envSchema = z.object({
  /** PostgreSQL connection string. */
  DATABASE_URL: z.url(),

  /** Redis connection string for BullMQ and caching. */
  REDIS_URL: z.url().default('redis://localhost:6379'),

  /** TCP port the HTTP server listens on. */
  PORT: z.coerce.number().int().positive().default(4000),

  /** Host address the server binds to. */
  HOST: z.string().default('0.0.0.0'),

  /**
   * Secret used to sign and verify JWT tokens. Required, no default: generate
   * one with `openssl rand -base64 48`.
   */
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  /** JWT token lifetime expressed as a duration string (e.g. "7d"). */
  JWT_EXPIRES_IN: z.string().default('7d'),

  /**
   * Key used to encrypt data-source secrets at rest (AES-256-GCM).
   * Any string of >= 32 characters; generate with `openssl rand -base64 48`.
   * When omitted it is derived from JWT_SECRET, which couples secret rotation
   * to stored credentials — set it explicitly in production.
   */
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be at least 32 characters')
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),

  /** Current runtime environment. */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  /** Pino log level. */
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  /** Comma-separated list of allowed CORS origins. Wildcards are rejected. */
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),

  /**
   * Whether cookies are marked `Secure`. Defaults to true in production.
   * Set to false only when deliberately serving over plain HTTP (e.g. an
   * internal Rancher deployment without TLS) — the auth cookie will not be
   * sent by browsers over HTTP while this is true.
   */
  COOKIE_SECURE: boolFromEnv(process.env.NODE_ENV === 'production'),

  /** `SameSite` attribute for the auth cookie. */
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  /**
   * Trust `X-Forwarded-*` headers. Enable when running behind the bundled Nginx
   * or any reverse proxy so rate limiting and logs see the real client IP.
   */
  TRUST_PROXY: boolFromEnv(process.env.NODE_ENV === 'production'),

  /**
   * Whether `POST /api/auth/register` is open. Defaults to false in production:
   * the first admin comes from the seed script, further users are created by
   * enabling this deliberately.
   */
  ALLOW_REGISTRATION: boolFromEnv(process.env.NODE_ENV !== 'production'),

  /** Global request budget per window, per IP. */
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

  /** Rate limit window (e.g. "1 minute"). */
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  /** Stricter budget for the login/register endpoints, per IP. */
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  /** Budget for inbound webhook delivery, per IP. */
  WEBHOOK_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),

  /** Maximum accepted request body size in bytes. */
  BODY_LIMIT_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1024 * 1024),

  /**
   * Reject inbound webhooks for instances that have no webhook secret
   * configured. Defaults to true in production — without it anyone who can
   * reach the ingress can forge events.
   */
  WEBHOOK_REQUIRE_SECRET: boolFromEnv(process.env.NODE_ENV === 'production'),

  /** Days of event history to keep. 0 disables the retention job. */
  EVENT_RETENTION_DAYS: z.coerce.number().int().min(0).default(30),

  /** Maximum serialized size of a single event payload, in bytes. */
  EVENT_PAYLOAD_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(64 * 1024),

  /**
   * Allow outbound notification webhooks to target private/loopback addresses.
   * Off by default (SSRF protection); enable when notifying an in-cluster
   * service such as an internal Mattermost.
   */
  ALLOW_PRIVATE_NETWORK_WEBHOOKS: boolFromEnv(false),

  /** Maximum allowed GraphQL query depth. */
  GRAPHQL_MAX_DEPTH: z.coerce.number().int().positive().default(12),

  /**
   * Public base URL that external services (GitLab/Nexus) use to call webhooks.
   * When empty, the platform auto-discovers the bundled Cloudflare quick tunnel
   * via TUNNEL_METRICS_URL. Set explicitly for production (your own domain).
   */
  PUBLIC_URL: optionalTrimmed,

  /** Metrics endpoint of the bundled cloudflared tunnel for URL auto-discovery. */
  TUNNEL_METRICS_URL: optionalTrimmed,
});

/** Inferred TypeScript type for the validated environment object. */
export type Env = z.infer<typeof envSchema>;

/** Known-weak secrets that shipped as examples; refused outright. */
const BANNED_SECRETS = new Set([
  'aHDNaPO7h5fp0XwTw2+2PWYgyHchyn3mB+g8saewO0DkeSZE7JocFz3wlgBbtZtm',
  'change-me',
  'changeme',
  'secret',
]);

/**
 * Parse and validate the current `process.env`.
 * Throws a descriptive error if any variable is missing or invalid.
 *
 * @returns Fully validated and typed environment configuration.
 */
function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  const parsed = result.data;

  if (BANNED_SECRETS.has(parsed.JWT_SECRET)) {
    throw new Error(
      'JWT_SECRET is set to a well-known example value. Generate a unique one:\n' +
        '  openssl rand -base64 48',
    );
  }

  const origins = parsed.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.includes('*')) {
    throw new Error('CORS_ORIGINS must not contain "*" — credentialed requests forbid wildcards.');
  }

  return parsed;
}

/** Singleton validated environment configuration. */
export const env: Env = loadEnv();

/** Whether the process runs in production mode. */
export const isProduction = env.NODE_ENV === 'production';

/** Parsed list of allowed CORS origins. */
export const corsOrigins: string[] = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
