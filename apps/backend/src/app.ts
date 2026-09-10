/**
 * @file Fastify application factory.
 * Creates and configures the Fastify instance with all plugins,
 * middleware, GraphQL (Mercurius), Socket.io, and webhook routes.
 */

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import mercurius, { type IResolvers, type MercuriusContext } from 'mercurius';
import { z } from 'zod';

import { corsOrigins, env, isProduction } from './config/index.js';
import type { GqlContext } from './graphql/index.js';
import { buildResolvers, typeDefs } from './graphql/index.js';
import {
  attachUser,
  COOKIE_NAME,
  clearCookieOptions,
  cookieOptions,
  requireAuth,
  requireRole,
  signToken,
} from './middleware/index.js';
import { DataSourceManager, registerSourcesFromManifests } from './plugins/index.js';
import { enqueueEvent, pingRedis, setupQueues } from './queue/index.js';
import {
  BindingResolver,
  BroadcastService,
  DashboardService,
  DataSourceService,
  EventService,
  NotificationService,
  PagePortabilityService,
} from './services/index.js';
import { isPublicError, logger, resolvePublicBaseUrl } from './utils/index.js';
import { setupWebSocket } from './websocket/index.js';

/** Shared Prisma client. */
const prisma = new PrismaClient();

/** Zod schema for the register request body. */
const registerSchema = z.object({
  email: z.email().max(320),
  name: z.string().trim().min(1).max(128),
  password: z.string().min(12).max(256),
});

/** Zod schema for the login request body. */
const loginSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(256),
});

/** Allowed platform roles for admin user-management requests. */
const roleSchema = z.enum(['ADMIN', 'EDITOR', 'VIEWER']);

/** Zod schema for changing the current user's password. */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256),
});

/** Zod schema for creating a user (admin only). */
const createUserSchema = z.object({
  email: z.email().max(320),
  name: z.string().trim().min(1).max(128),
  password: z.string().min(12).max(256),
  role: roleSchema,
});

/** Zod schema for updating a user's name/role (admin only). */
const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(128).optional(),
    role: roleSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.role !== undefined, {
    message: 'Nothing to update',
  });

/** Zod schema for an admin resetting a user's password. */
const resetPasswordSchema = z.object({
  newPassword: z.string().min(12).max(256),
});

/**
 * Build and return a fully configured Fastify application.
 *
 * @returns The Fastify instance ready to be started.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: env.TRUST_PROXY,
    bodyLimit: env.BODY_LIMIT_BYTES,
    disableRequestLogging: isProduction,
    logger: {
      level: env.LOG_LEVEL,
      // Never let a credential reach the log stream.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-gitlab-token"]',
          'req.headers["x-webhook-secret"]',
          'res.headers["set-cookie"]',
        ],
        censor: '[redacted]',
      },
      ...(env.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
    },
  });

  /* ------------------------------------------------------------------ */
  /*  Uniform error envelope                                             */
  /* ------------------------------------------------------------------ */
  // Every failure — thrown errors, validation, rate limits — leaves as
  // `{ error: string }` so the frontend can rely on a single shape. 5xx
  // messages are not leaked to the client; they are logged instead.
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled request error');
      return reply.code(statusCode).send({ error: 'Internal server error' });
    }
    return reply.code(statusCode).send({ error: error.message });
  });

  /* ------------------------------------------------------------------ */
  /*  Security plugins                                                   */
  /* ------------------------------------------------------------------ */
  await app.register(helmet, {
    // The API serves JSON and the GraphiQL explorer (development only); the SPA
    // is served by Nginx, which sets its own CSP.
    contentSecurityPolicy: isProduction,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(cookie);

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    // Health probes come from the orchestrator and must never be throttled.
    allowList: (request) => request.url === '/health' || request.url === '/health/live',
  });

  /* ------------------------------------------------------------------ */
  /*  Identify the caller on every request (never rejects)               */
  /* ------------------------------------------------------------------ */
  app.addHook('onRequest', attachUser);

  /* ------------------------------------------------------------------ */
  /*  Services & Plugin Manager                                          */
  /* ------------------------------------------------------------------ */
  const dataSourceManager = new DataSourceManager();
  await registerSourcesFromManifests(dataSourceManager);
  const eventService = new EventService(prisma);
  const dataSourceService = new DataSourceService(prisma, dataSourceManager);
  const bindingResolver = new BindingResolver(dataSourceService);
  const dashboardService = new DashboardService(prisma);
  const portabilityService = new PagePortabilityService(dashboardService);
  const notificationService = new NotificationService(prisma);
  const broadcastService = new BroadcastService(prisma);

  /* ------------------------------------------------------------------ */
  /*  BullMQ                                                             */
  /* ------------------------------------------------------------------ */
  setupQueues(eventService, notificationService);

  /* ------------------------------------------------------------------ */
  /*  Wire plugin manager events -> queue + websocket                    */
  /* ------------------------------------------------------------------ */
  dataSourceManager.on('*', (event) => {
    enqueueEvent(event).catch((err) => {
      logger.error(`Failed to enqueue event: ${(err as Error).message}`);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  GraphQL (Mercurius)                                                */
  /* ------------------------------------------------------------------ */
  const resolvers = buildResolvers();

  await app.register(mercurius, {
    schema: typeDefs,
    resolvers: resolvers as IResolvers<unknown, MercuriusContext>,
    subscription: true,
    graphiql: !isProduction,
    // A malicious deep query can amplify one request into a large traversal.
    queryDepth: env.GRAPHQL_MAX_DEPTH,
    context: (request): Omit<GqlContext, 'pubsub' | 'app' | 'reply' | '__currentQuery'> => ({
      prisma,
      dataSourceManager,
      eventService,
      dataSourceService,
      bindingResolver,
      dashboardService,
      portabilityService,
      notificationService,
      broadcastService,
      user: request.user,
    }),
    errorFormatter: (execution, context) => {
      const formatted = mercurius.defaultErrorFormatter(execution, context);
      if (!isProduction) return formatted;

      // In production, caller-facing errors (auth, validation, not-found) keep
      // their message and code so the client can react; anything else is logged
      // in full and reduced to a generic message, because Prisma failures and
      // stack traces name columns, constraints, and filesystem paths.
      const errors = (execution.errors ?? []).map((error) => {
        const original = error.originalError;

        if (isPublicError(original)) {
          return {
            message: original.message,
            path: error.path,
            extensions: { code: original.code, statusCode: original.statusCode },
          };
        }

        logger.error(`GraphQL error: ${error.message}`);
        return {
          message: 'Internal server error',
          path: error.path,
          extensions: { code: 'INTERNAL_SERVER_ERROR', statusCode: 500 },
        };
      });

      return {
        statusCode: formatted.statusCode,
        response: { data: formatted.response.data, errors },
      } as ReturnType<typeof mercurius.defaultErrorFormatter>;
    },
  });

  /* ------------------------------------------------------------------ */
  /*  Socket.io                                                          */
  /* ------------------------------------------------------------------ */
  const httpServer = app.server;
  setupWebSocket(httpServer, broadcastService);

  /**
   * Prevent Fastify from intercepting Socket.io handshake requests.
   * Socket.io attaches directly to the HTTP server, so Fastify's
   * router should not handle these paths.
   */
  app.addHook('onRequest', (request, reply, done) => {
    if (request.url.startsWith('/socket.io/')) {
      reply.hijack();
      return;
    }
    done();
  });

  /* ------------------------------------------------------------------ */
  /*  REST: Auth routes                                                  */
  /* ------------------------------------------------------------------ */

  /** Stricter budget for credential endpoints, to blunt brute-force attempts. */
  const authRateLimit = {
    rateLimit: { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW },
  };

  /**
   * Register a new user account.
   * Hashes the password, creates the user, signs a JWT, and sets it
   * as an HTTP-only cookie.
   *
   * Disabled by default in production (`ALLOW_REGISTRATION`): an open
   * registration endpoint on a self-hosted dashboard is an account-creation
   * hole, and the first admin already comes from the seed script.
   */
  app.post('/api/auth/register', { config: authRateLimit }, async (request, reply) => {
    if (!env.ALLOW_REGISTRATION) {
      return reply.code(403).send({ error: 'Registration is disabled on this instance' });
    }

    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: z.flattenError(parsed.error).fieldErrors,
      });
    }

    const { email, name, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    // The very first account owns the instance; later ones start read-only.
    const isFirstUser = (await prisma.user.count()) === 0;

    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash,
        role: isFirstUser ? 'ADMIN' : 'VIEWER',
      },
    });

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    reply.setCookie(COOKIE_NAME, token, cookieOptions);
    return reply.code(201).send({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  });

  /**
   * Authenticate an existing user.
   * Verifies password, signs a JWT, and sets it as an HTTP-only cookie.
   */
  app.post('/api/auth/login', { config: authRateLimit }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: z.flattenError(parsed.error).fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Spend comparable time on an unknown address so the response time does
      // not distinguish "no such user" from "wrong password".
      await argon2.hash(password);
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    reply.setCookie(COOKIE_NAME, token, cookieOptions);
    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  });

  /**
   * Log out the current user by clearing the authentication cookie.
   */
  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, clearCookieOptions);
    return reply.send({ ok: true });
  });

  /**
   * Return the currently authenticated user's profile.
   * Requires a valid JWT in the cookie.
   */
  app.get('/api/auth/me', { onRequest: [requireAuth] }, async (request, reply) => {
    const jwtUser = request.user;
    if (!jwtUser) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: jwtUser.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    if (!user) {
      // The token references a deleted account — clear it so the client stops
      // presenting it.
      reply.clearCookie(COOKIE_NAME, clearCookieOptions);
      return reply.code(401).send({ error: 'Authentication required' });
    }

    return reply.send({ user });
  });

  /**
   * Change the current user's own password. Verifies the current password and
   * clears the `mustChangePassword` flag (used by the first-login flow).
   */
  app.post('/api/auth/change-password', { onRequest: [requireAuth] }, async (request, reply) => {
    const jwtUser = request.user;
    if (!jwtUser) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: z.flattenError(parsed.error).fieldErrors,
      });
    }

    const user = await prisma.user.findUnique({ where: { id: jwtUser.sub } });
    if (!user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    const valid = await argon2.verify(user.passwordHash, parsed.data.currentPassword);
    if (!valid) {
      return reply.code(400).send({ error: 'Current password is incorrect' });
    }

    const passwordHash = await argon2.hash(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    return reply.send({ ok: true });
  });

  /* ------------------------------------------------------------------ */
  /*  REST: User management (admin only)                                 */
  /* ------------------------------------------------------------------ */

  /** Fields returned for any user record (never the password hash). */
  const userSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    mustChangePassword: true,
    createdAt: true,
  } as const;

  /** List all users. */
  app.get('/api/users', { onRequest: [requireRole('ADMIN')] }, async (_request, reply) => {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: 'asc' },
    });
    return reply.send({ users });
  });

  /** Create a user. New accounts must change their password on first login. */
  app.post('/api/users', { onRequest: [requireRole('ADMIN')] }, async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: z.flattenError(parsed.error).fieldErrors,
      });
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await argon2.hash(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role,
        mustChangePassword: true,
      },
      select: userSelect,
    });

    return reply.code(201).send({ user });
  });

  /** Update a user's name and/or role. Guards the last remaining admin. */
  app.patch('/api/users/:id', { onRequest: [requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: z.flattenError(parsed.error).fieldErrors,
      });
    }

    if (parsed.data.role && parsed.data.role !== 'ADMIN') {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (
        target?.role === 'ADMIN' &&
        (await prisma.user.count({ where: { role: 'ADMIN' } })) <= 1
      ) {
        return reply.code(400).send({ error: 'Cannot demote the last admin' });
      }
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: userSelect,
    });
    return reply.send({ user });
  });

  /** Reset a user's password; forces a change on their next login. */
  app.post(
    '/api/users/:id/reset-password',
    { onRequest: [requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = resetPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: z.flattenError(parsed.error).fieldErrors,
        });
      }

      const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
      if (!existing) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const passwordHash = await argon2.hash(parsed.data.newPassword);
      await prisma.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true },
      });
      return reply.send({ ok: true });
    },
  );

  /** Delete a user. Cannot delete yourself or the last admin. */
  app.delete('/api/users/:id', { onRequest: [requireRole('ADMIN')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (request.user?.sub === id) {
      return reply.code(400).send({ error: 'You cannot delete your own account' });
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) {
      return reply.code(404).send({ error: 'User not found' });
    }
    if (target.role === 'ADMIN' && (await prisma.user.count({ where: { role: 'ADMIN' } })) <= 1) {
      return reply.code(400).send({ error: 'Cannot delete the last admin' });
    }

    await prisma.user.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  /* ------------------------------------------------------------------ */
  /*  REST: Public broadcast link access                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Retrieve a broadcast link and its dashboards by public token.
   * No authentication required — this is the wall-display entry point.
   * Disabled links are not found (see `findByToken`).
   */
  app.get<{ Params: { token: string } }>('/api/broadcast/:token', async (request, reply) => {
    const { token } = request.params;
    if (typeof token !== 'string' || token.length < 8 || token.length > 128) {
      return reply.code(400).send({ error: 'Malformed token' });
    }

    const link = await broadcastService.findByToken(token);

    if (!link) {
      return reply.code(404).send({ error: 'Broadcast link not found' });
    }

    return reply.send({
      id: link.id,
      token: link.token,
      name: link.name,
      enabled: link.enabled,
      dashboards: link.dashboards.map((d) => d.dashboard),
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    });
  });

  /* ------------------------------------------------------------------ */
  /*  REST: Webhook ingress                                              */
  /* ------------------------------------------------------------------ */
  app.post<{ Params: { pluginId: string } }>(
    '/api/webhooks/:pluginId',
    {
      config: {
        rateLimit: { max: env.WEBHOOK_RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW },
      },
    },
    async (request, reply) => {
      const { pluginId } = request.params;

      if (!/^[a-z][a-z0-9-]{0,63}$/.test(pluginId)) {
        return reply.code(400).send({ error: 'Malformed plugin id' });
      }

      try {
        await dataSourceService.deliverWebhook(
          pluginId,
          request.body,
          request.headers as Record<string, string | undefined>,
        );
        return reply.code(202).send({ ok: true });
      } catch (err) {
        const message = (err as Error).message;
        logger.warn(`Webhook rejected for plugin "${pluginId}": ${message}`);
        // Do not echo the reason: a caller probing secrets learns nothing.
        return reply.code(400).send({ error: 'Webhook rejected' });
      }
    },
  );

  /* ------------------------------------------------------------------ */
  /*  Health checks                                                      */
  /* ------------------------------------------------------------------ */

  /** Liveness: the process is up and the event loop responds. */
  app.get('/health/live', async () => ({ status: 'ok' }));

  /**
   * Readiness: every dependency the app needs to serve traffic answers.
   * Returns 503 when a dependency is down so the orchestrator stops routing.
   */
  app.get('/health', async (_request, reply) => {
    const checks: Record<string, 'ok' | 'error'> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (err) {
      checks.database = 'error';
      logger.error(`Health check: database unreachable — ${(err as Error).message}`);
    }

    try {
      checks.redis = (await pingRedis()) ? 'ok' : 'error';
    } catch {
      checks.redis = 'error';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');
    return reply.code(healthy ? 200 : 503).send({
      status: healthy ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Store references for graceful shutdown                             */
  /* ------------------------------------------------------------------ */
  app.decorate('prisma', prisma);
  app.decorate('dataSourceManager', dataSourceManager);

  /* ------------------------------------------------------------------ */
  /*  Resolve the public webhook base URL (env or bundled tunnel) and     */
  /*  re-register webhooks against it once known.                         */
  /* ------------------------------------------------------------------ */
  void resolvePublicBaseUrl((url) => {
    dataSourceService.reregisterWebhooks(url).catch((err) => {
      logger.warn(`Webhook re-registration failed: ${(err as Error).message}`);
    });
  });

  return app;
}
