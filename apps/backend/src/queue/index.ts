/**
 * @file BullMQ setup, workers, and job processors.
 * Defines three queues:
 * - `event-processing`      : persists incoming platform events and broadcasts them.
 * - `notification-delivery` : evaluates notification rules and dispatches actions.
 * - `maintenance`           : periodic housekeeping (event retention).
 */

import type { PlatformEvent } from '@eventium/shared';
import { type Job, Queue, Worker } from 'bullmq';
import { Redis as IORedis } from 'ioredis';
import { env } from '../config/index.js';
import type { EventService } from '../services/event.service.js';
import type { NotificationService } from '../services/notification.service.js';
import { assertPublicHttpUrl, logger } from '../utils/index.js';
import { broadcastEvent } from '../websocket/index.js';

/** Shared IORedis connection for all queues and workers. */
let connection: IORedis | null = null;

/** BullMQ queue for event persistence jobs. */
let eventQueue: Queue | null = null;

/** BullMQ queue for notification delivery jobs. */
let notificationQueue: Queue | null = null;

/** BullMQ queue for periodic housekeeping. */
let maintenanceQueue: Queue | null = null;

/** BullMQ worker for event processing. */
let eventWorker: Worker | null = null;

/** BullMQ worker for notification delivery. */
let notificationWorker: Worker | null = null;

/** BullMQ worker for housekeeping jobs. */
let maintenanceWorker: Worker | null = null;

/** Retention job identifier, kept stable so repeats are not duplicated. */
const RETENTION_JOB = 'event-retention';

/** How long an outbound notification webhook may take before it is aborted. */
const WEBHOOK_TIMEOUT_MS = 10_000;

/** Default retry policy for jobs that touch the network or the database. */
const RETRY_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2_000 },
  removeOnComplete: 1_000,
  removeOnFail: 5_000,
};

/**
 * Create the shared Redis connection used by all queues.
 *
 * @returns IORedis instance.
 */
function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
    connection.on('error', (err) => {
      logger.error(`Redis connection error: ${err.message}`);
    });
  }
  return connection;
}

/**
 * Probe Redis for the readiness endpoint.
 *
 * @returns `true` when Redis answers PING.
 */
export async function pingRedis(): Promise<boolean> {
  try {
    const result = await getConnection().ping();
    return result === 'PONG';
  } catch (err) {
    logger.error(`Redis ping failed: ${(err as Error).message}`);
    return false;
  }
}

/**
 * Initialise BullMQ queues and start the background workers.
 *
 * @param eventService        - Service used to persist events.
 * @param notificationService - Service used to evaluate rules.
 */
export function setupQueues(
  eventService: EventService,
  notificationService: NotificationService,
): void {
  const conn = getConnection();

  eventQueue = new Queue('event-processing', { connection: conn });
  notificationQueue = new Queue('notification-delivery', { connection: conn });
  maintenanceQueue = new Queue('maintenance', { connection: conn });

  eventWorker = new Worker(
    'event-processing',
    async (job: Job<PlatformEvent>) => {
      const event = job.data;

      await eventService.create(event);
      broadcastEvent(event);

      await notificationQueue?.add('evaluate', event, RETRY_OPTIONS);

      logger.debug(`Event "${event.eventType}" persisted and broadcast.`);
    },
    { connection: conn, concurrency: 10 },
  );

  notificationWorker = new Worker(
    'notification-delivery',
    async (job: Job<PlatformEvent>) => {
      const event = job.data;
      const actions = await notificationService.evaluate(event);

      for (const action of actions) {
        try {
          await executeAction(action.type, action.config, event);
        } catch (err) {
          // One failing transport must not stop the others.
          logger.error(`Notification action "${action.type}" failed: ${(err as Error).message}`);
        }
      }
    },
    { connection: conn, concurrency: 5 },
  );

  maintenanceWorker = new Worker(
    'maintenance',
    async (job: Job) => {
      if (job.name !== RETENTION_JOB) return;
      if (env.EVENT_RETENTION_DAYS <= 0) return;

      const removed = await eventService.deleteOlderThan(env.EVENT_RETENTION_DAYS);
      if (removed > 0) {
        logger.info(
          `Retention: removed ${removed} event(s) older than ${env.EVENT_RETENTION_DAYS} day(s).`,
        );
      }
    },
    { connection: conn, concurrency: 1 },
  );

  eventWorker.on('failed', (job, err) => {
    logger.error(`Event processing job ${job?.id} failed: ${err.message}`);
  });

  notificationWorker.on('failed', (job, err) => {
    logger.error(`Notification delivery job ${job?.id} failed: ${err.message}`);
  });

  maintenanceWorker.on('failed', (job, err) => {
    logger.error(`Maintenance job ${job?.id} failed: ${err.message}`);
  });

  void scheduleRetention();

  logger.info('BullMQ queues and workers initialised.');
}

/**
 * Register the daily event-retention job. Idempotent: BullMQ keys a repeatable
 * job by name + pattern, so restarts do not accumulate duplicates.
 */
async function scheduleRetention(): Promise<void> {
  if (!maintenanceQueue || env.EVENT_RETENTION_DAYS <= 0) {
    if (env.EVENT_RETENTION_DAYS <= 0) {
      logger.info('EVENT_RETENTION_DAYS is 0 — event history is kept indefinitely.');
    }
    return;
  }

  try {
    await maintenanceQueue.add(
      RETENTION_JOB,
      {},
      {
        repeat: { pattern: '17 3 * * *' },
        removeOnComplete: 10,
        removeOnFail: 20,
      },
    );
    logger.info(
      `Event retention scheduled daily; keeping ${env.EVENT_RETENTION_DAYS} day(s) of history.`,
    );
  } catch (err) {
    logger.warn(`Could not schedule the retention job: ${(err as Error).message}`);
  }
}

/**
 * Enqueue a platform event for asynchronous processing.
 *
 * @param event - The platform event to process.
 */
export async function enqueueEvent(event: PlatformEvent): Promise<void> {
  if (!eventQueue) {
    throw new Error('Event queue has not been initialised.');
  }

  await eventQueue.add('process', capPayload(event), RETRY_OPTIONS);
}

/**
 * Drop an oversized event payload before it reaches Redis and Postgres. A plugin
 * that forwards a whole webhook body can otherwise persist megabytes per event.
 *
 * @param event - The event as emitted by a data source.
 */
function capPayload(event: PlatformEvent): PlatformEvent {
  const payload = event.payload ?? {};
  let size: number;
  try {
    size = Buffer.byteLength(JSON.stringify(payload));
  } catch {
    return { ...event, payload: { _dropped: 'payload is not serialisable' } };
  }

  if (size <= env.EVENT_PAYLOAD_MAX_BYTES) return event;

  logger.warn(
    `Event "${event.eventType}" payload is ${size} bytes (limit ${env.EVENT_PAYLOAD_MAX_BYTES}); truncating.`,
  );
  return {
    ...event,
    payload: { _dropped: `payload exceeded ${env.EVENT_PAYLOAD_MAX_BYTES} bytes`, _size: size },
  };
}

/**
 * Execute a single notification action.
 *
 * @param type   - Action transport identifier.
 * @param config - Transport-specific configuration.
 * @param event  - The triggering platform event.
 */
async function executeAction(
  type: string,
  config: Record<string, unknown>,
  event: PlatformEvent,
): Promise<void> {
  switch (type) {
    case 'webhook': {
      const rawUrl = String(config.url ?? '');
      // Resolve and vet the target: the backend can reach the cluster network,
      // the rule author cannot.
      const url = await assertPublicHttpUrl(rawUrl);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Eventium/1.0' },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        // A redirect could point back into private space after the check.
        redirect: 'manual',
      });

      if (!response.ok) {
        throw new Error(`Webhook responded ${response.status}`);
      }

      logger.info(`Webhook notification delivered to ${url.origin}.`);
      break;
    }
    case 'log':
      logger.info(`[Notification] ${event.title} (${event.severity}) — ${event.description}`);
      break;
    default:
      logger.warn(`Unknown notification action type: "${type}".`);
  }
}

/**
 * Gracefully shut down all workers, queues, and the Redis connection.
 */
export async function shutdownQueues(): Promise<void> {
  await eventWorker?.close();
  await notificationWorker?.close();
  await maintenanceWorker?.close();
  await eventQueue?.close();
  await notificationQueue?.close();
  await maintenanceQueue?.close();
  await connection?.quit();

  eventWorker = null;
  notificationWorker = null;
  maintenanceWorker = null;
  eventQueue = null;
  notificationQueue = null;
  maintenanceQueue = null;
  connection = null;

  logger.info('BullMQ queues and workers shut down.');
}
