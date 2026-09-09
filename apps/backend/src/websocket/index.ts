/**
 * @file Socket.io setup and event broadcasting.
 *
 * Every connection is authenticated during the handshake. There are two kinds of
 * client:
 *
 *  - a signed-in user (session cookie) — receives all events;
 *  - a wall display holding a broadcast token — receives only events from the
 *    data-source types that broadcast's own page actually displays.
 *
 * Unauthenticated sockets are refused. Before this, any host that could reach
 * the port received every event on the platform.
 */

import type { Server as HttpServer } from 'node:http';
import type { PlatformEvent } from '@eventium/shared';
import { type Socket, Server as SocketServer } from 'socket.io';
import { corsOrigins, env } from '../config/index.js';
import { COOKIE_NAME, type JwtPayload, verifyToken } from '../middleware/index.js';
import type { BroadcastService } from '../services/broadcast.service.js';
import { logger } from '../utils/index.js';

/** Room that receives every event: all signed-in users. */
const AUTHENTICATED_ROOM = 'authenticated';

/** Per-socket state attached during the handshake. */
interface SocketState {
  /** The signed-in user, when the socket carried a session cookie. */
  user?: JwtPayload;
  /** Source types a broadcast socket is allowed to observe. */
  sourceTypes?: string[];
}

/** Singleton Socket.io server instance. */
let io: SocketServer | null = null;

/**
 * Read the auth cookie out of a raw handshake `Cookie` header. Socket.io hands
 * over the untouched HTTP request, so there is no Fastify cookie parser here.
 */
function tokenFromCookieHeader(header: string | undefined): string | undefined {
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== COOKIE_NAME) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Initialise the Socket.io server and bind it to the provided HTTP server.
 *
 * @param httpServer - Node.js HTTP server instance (from Fastify).
 * @param broadcasts - Broadcast service, used to authorise wall displays.
 * @returns The configured Socket.io server.
 */
export function setupWebSocket(httpServer: HttpServer, broadcasts: BroadcastService): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io/',
    maxHttpBufferSize: env.BODY_LIMIT_BYTES,
  });

  /** Handshake gate: identify the client or refuse the connection. */
  io.use(async (socket, next) => {
    try {
      const user = await verifyToken(tokenFromCookieHeader(socket.request.headers.cookie));
      if (user) {
        (socket.data as SocketState).user = user;
        return next();
      }

      const broadcastToken = socket.handshake.auth?.broadcastToken;
      if (typeof broadcastToken === 'string' && broadcastToken.length >= 8) {
        const sourceTypes = await broadcasts.allowedSourceTypes(broadcastToken);
        if (sourceTypes) {
          (socket.data as SocketState).sourceTypes = [...sourceTypes];
          return next();
        }
      }

      next(new Error('unauthorized'));
    } catch (err) {
      logger.warn(`WebSocket handshake failed: ${(err as Error).message}`);
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const state = socket.data as SocketState;

    if (state.user) {
      socket.join(AUTHENTICATED_ROOM);
      logger.debug(`WebSocket client connected: ${socket.id} (user ${state.user.email})`);
    } else {
      for (const sourceType of state.sourceTypes ?? []) {
        socket.join(`source:${sourceType}`);
      }
      logger.debug(
        `WebSocket broadcast display connected: ${socket.id} ` +
          `(sources: ${(state.sourceTypes ?? []).join(', ') || 'none'})`,
      );
    }

    /**
     * Signed-in clients can narrow their stream to a specific instance. Room
     * membership is only a filter — authorisation already happened at handshake.
     */
    socket.on('subscribe', (payload: unknown) => {
      const instanceId = readInstanceId(payload);
      if (!instanceId || !state.user) return;
      socket.join(`plugin:${instanceId}`);
    });

    /** Leave a plugin-instance room. */
    socket.on('unsubscribe', (payload: unknown) => {
      const instanceId = readInstanceId(payload);
      if (!instanceId) return;
      socket.leave(`plugin:${instanceId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`WebSocket client disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info('Socket.io server initialised.');
  return io;
}

/**
 * Accept both the bare-string and object forms clients send for
 * subscribe/unsubscribe.
 */
function readInstanceId(payload: unknown): string | null {
  if (typeof payload === 'string') return payload.slice(0, 64) || null;
  if (payload && typeof payload === 'object') {
    const value = (payload as { pluginInstanceId?: unknown }).pluginInstanceId;
    if (typeof value === 'string') return value.slice(0, 64) || null;
  }
  return null;
}

/**
 * Broadcast a platform event to the clients entitled to see it: every signed-in
 * user, plus wall displays whose broadcast covers the event's source type.
 *
 * @param event - Enriched platform event to broadcast.
 */
export function broadcastEvent(event: PlatformEvent): void {
  if (!io) return;

  io.to(AUTHENTICATED_ROOM).to(`source:${event.sourceType}`).emit('event:new', event);
}

/**
 * Return the current Socket.io server instance.
 *
 * @returns The Socket.io server or `null` if not yet initialised.
 */
export function getSocketServer(): SocketServer | null {
  return io;
}

/** Close the Socket.io server, dropping all connections. */
export async function shutdownWebSocket(): Promise<void> {
  if (!io) return;
  await io.close();
  io = null;
}

/** Re-exported for tests and typing convenience. */
export type { Socket };
