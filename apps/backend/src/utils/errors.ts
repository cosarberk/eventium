/**
 * @file Error types that distinguish "the caller did something wrong" from
 * "the server broke".
 *
 * In production, error messages are not passed through blindly: a Prisma failure
 * names columns and constraints, and a stack trace names paths. But the opposite
 * extreme — masking everything — is just as wrong, because the client can no
 * longer tell an expired session from a validation failure and cannot react
 * (redirect to login, highlight a field).
 *
 * So errors are split explicitly: anything deriving from {@link PublicError} is
 * meant for the caller and keeps its message and status; everything else is
 * logged in full and reported as a generic internal error.
 */

/** Base class for errors whose message is safe to return to the caller. */
export class PublicError extends Error {
  /** HTTP-equivalent status, surfaced in the GraphQL error extensions. */
  readonly statusCode: number;

  /** Stable machine-readable code for clients to branch on. */
  readonly code: string;

  /**
   * @param message    - Caller-facing message.
   * @param statusCode - HTTP-equivalent status code.
   * @param code       - Stable error code.
   */
  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** No valid session was presented. */
export class UnauthorizedError extends PublicError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

/** A valid session lacks the role required for the operation. */
export class ForbiddenError extends PublicError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

/** The request was well-formed but its contents are not acceptable. */
export class ValidationError extends PublicError {
  constructor(message: string) {
    super(message, 400, 'BAD_USER_INPUT');
  }
}

/** The addressed resource does not exist (or is not visible to the caller). */
export class NotFoundError extends PublicError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/** The request conflicts with the current state. */
export class ConflictError extends PublicError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Whether an unknown thrown value is a caller-facing error.
 *
 * @param err - The thrown value.
 */
export function isPublicError(err: unknown): err is PublicError {
  return err instanceof PublicError;
}
