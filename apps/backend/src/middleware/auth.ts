/**
 * @file JWT authentication and role-based authorization for Fastify.
 *
 * Two hooks with distinct jobs:
 *  - {@link attachUser} decodes the cookie when present and attaches the user.
 *    It never rejects, so genuinely public routes (the broadcast view, the
 *    server config query) keep working while authenticated callers are
 *    identified. It runs globally, including for `/graphql`.
 *  - {@link requireAuth} rejects a request that has no valid session. Use it on
 *    REST routes; GraphQL enforces the equivalent check per resolver.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import * as jose from 'jose';
import { env, isProduction } from '../config/index.js';
import { logger } from '../utils/index.js';

/** Platform roles, ordered from least to most privileged. */
export const ROLES = ['VIEWER', 'EDITOR', 'ADMIN'] as const;

/** A platform role. */
export type Role = (typeof ROLES)[number];

/** Shape of the JWT payload stored in tokens. */
export interface JwtPayload {
  /** User's unique identifier. */
  sub: string;
  /** User's email address. */
  email: string;
  /** User's platform role. */
  role: Role;
}

/** Extend Fastify's request type with the decoded user payload. */
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/** Encoded secret used for HMAC-based JWT verification. */
const secret = new TextEncoder().encode(env.JWT_SECRET);

/** Cookie name used to store the JWT. */
export const COOKIE_NAME = 'eventium_token';

/** Configuration options for the authentication cookie. */
export const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
} as const;

/** Numeric rank of a role, for `>=` comparisons. */
function rank(role: string): number {
  const index = ROLES.indexOf(role as Role);
  return index === -1 ? -1 : index;
}

/**
 * Whether a role meets or exceeds the required level.
 *
 * @param role     - The role being checked.
 * @param required - Minimum role needed.
 */
export function hasRole(role: string | undefined, required: Role): boolean {
  if (!role) return false;
  return rank(role) >= rank(required);
}

/**
 * Verify a raw JWT and return its payload.
 *
 * @param token - The encoded JWT.
 * @returns The decoded payload, or `null` when the token is absent or invalid.
 */
export async function verifyToken(token: string | undefined): Promise<JwtPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jose.jwtVerify(token, secret, { algorithms: ['HS256'] });
    const role = String(payload.role ?? '');
    if (!payload.sub || rank(role) === -1) return null;

    return { sub: payload.sub, email: String(payload.email ?? ''), role: role as Role };
  } catch {
    return null;
  }
}

/**
 * Global `onRequest` hook that identifies the caller when a valid cookie is
 * present. Never short-circuits the request.
 */
export async function attachUser(request: FastifyRequest): Promise<void> {
  const user = await verifyToken(request.cookies?.[COOKIE_NAME]);
  if (user) request.user = user;
}

/**
 * Route-level `onRequest` hook that enforces an authenticated session.
 * Responds with 401 when the token is absent or invalid.
 *
 * @param request - Incoming Fastify request.
 * @param reply   - Fastify reply used to short-circuit on failure.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.user) {
    await attachUser(request);
  }
  if (!request.user) {
    return reply.code(401).send({ error: 'Authentication required' });
  }
}

/**
 * Build a route-level hook that enforces a minimum role.
 *
 * @param required - Minimum role allowed through.
 */
export function requireRole(required: Role) {
  return async function roleGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      await attachUser(request);
    }
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }
    if (!hasRole(request.user.role, required)) {
      logger.warn(`User ${request.user.email} lacks role ${required} for ${request.url}`);
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
  };
}

/**
 * Sign a new JWT for a given user.
 *
 * @param payload - Data to encode in the token.
 * @returns A signed JWT string.
 */
export async function signToken(payload: JwtPayload): Promise<string> {
  return new jose.SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secret);
}

/** Cookie options used when clearing the session cookie. */
export const clearCookieOptions = {
  path: '/',
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
} as const;

/** Whether the deployment is expected to be served over TLS. */
export const expectsTls = isProduction && env.COOKIE_SECURE;
