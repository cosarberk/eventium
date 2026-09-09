/**
 * @file Pino logger configuration.
 * Exports a pre-configured logger instance that respects the LOG_LEVEL
 * environment variable and applies pretty-printing in development.
 */

import pino from 'pino';
import { env } from '../config/index.js';

/**
 * Create the application-wide Pino logger.
 *
 * @returns A configured Pino logger instance.
 */
function createLogger(): pino.Logger {
  const isDev = env.NODE_ENV === 'development';

  return pino({
    level: env.LOG_LEVEL,
    ...(isDev && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
    }),
  });
}

/** Singleton application logger. */
export const logger = createLogger();
