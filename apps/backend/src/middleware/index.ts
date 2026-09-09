/**
 * @file Barrel export for the middleware module.
 */

export type { JwtPayload, Role } from './auth.js';
export {
  attachUser,
  COOKIE_NAME,
  clearCookieOptions,
  cookieOptions,
  hasRole,
  ROLES,
  requireAuth,
  requireRole,
  signToken,
  verifyToken,
} from './auth.js';
