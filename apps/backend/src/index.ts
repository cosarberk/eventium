/**
 * @file Application entry point.
 * Creates the Fastify application, verifies its dependencies, starts the HTTP
 * server, and handles graceful shutdown.
 */

import type { PrismaClient } from '@prisma/client';
import { buildApp } from './app.js';
import { env, isProduction } from './config/index.js';
import { shutdownQueues } from './queue/index.js';
import { logger } from './utils/index.js';
import { shutdownWebSocket } from './websocket/index.js';

/** How long a graceful shutdown may take before the process is forced down. */
const SHUTDOWN_TIMEOUT_MS = 15_000;

/**
 * Bootstrap and start the Eventium backend server.
 */
async function main(): Promise<void> {
  const app = await buildApp();
  const prisma = (app as unknown as { prisma: PrismaClient }).prisma;

  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection established.');
  } catch (err) {
    logger.fatal(`Failed to connect to database: ${(err as Error).message}`);
    process.exit(1);
  }

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      logger.warn(`Received ${signal} during shutdown; exiting immediately.`);
      process.exit(1);
    }
    shuttingDown = true;
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out; forcing exit.');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      await shutdownWebSocket();
      await app.close();
      await shutdownQueues();
      await prisma.$disconnect();
      logger.info('Server shut down successfully.');
      process.exit(0);
    } catch (err) {
      logger.error(`Error during shutdown: ${(err as Error).message}`);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // A rejection nobody handled leaves the process in an unknown state; in
  // production let the orchestrator restart a clean one.
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.message : reason}`);
  });

  process.on('uncaughtException', (err) => {
    logger.fatal(`Uncaught exception: ${err.message}`);
    if (isProduction) {
      void shutdown('uncaughtException');
    }
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(`Eventium backend running at http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    logger.fatal(`Failed to start server: ${(err as Error).message}`);
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  logger.fatal(`Fatal startup error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
