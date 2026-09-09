/**
 * @file Event service.
 * Handles persistence, retrieval, and filtering of events
 * produced by plugin instances.
 */

import type { PlatformEvent } from '@eventium/shared';
import type { Prisma, PrismaClient, Severity } from '@prisma/client';

/** Filters accepted when querying events. */
export interface EventFilter {
  /** Filter by plugin instance. */
  pluginInstanceId?: string;
  /** Filter by event type. */
  eventType?: string;
  /** Filter by minimum severity. */
  severity?: Severity;
  /** Return events created after this ISO timestamp. */
  after?: string;
  /** Return events created before this ISO timestamp. */
  before?: string;
  /** Number of records to return (default 50, max 200). */
  limit?: number;
  /** Zero-based offset for pagination. */
  offset?: number;
}

/** Shape returned by paginated event queries. */
export interface PaginatedEvents {
  /** The page of events. */
  items: Awaited<ReturnType<PrismaClient['event']['findMany']>>;
  /** Total number of matching records. */
  total: number;
}

/**
 * Service responsible for event persistence and querying.
 */
export class EventService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Persist a platform event into the database.
   *
   * @param event - Enriched platform event to store.
   * @returns The created database record.
   */
  async create(event: PlatformEvent) {
    return this.prisma.event.create({
      data: {
        pluginInstanceId: event.pluginInstanceId,
        sourceType: event.sourceType,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        payload: event.payload as Prisma.InputJsonValue,
        severity: event.severity as Severity,
        createdAt: new Date(event.createdAt),
      },
    });
  }

  /**
   * Query events with optional filters and pagination.
   *
   * @param filter - Query parameters.
   * @returns Paginated result containing matching events and total count.
   */
  async find(filter: EventFilter = {}): Promise<PaginatedEvents> {
    const limit = Math.min(filter.limit ?? 50, 200);
    const offset = filter.offset ?? 0;

    const where = {
      ...(filter.pluginInstanceId && {
        pluginInstanceId: filter.pluginInstanceId,
      }),
      ...(filter.eventType && { eventType: filter.eventType }),
      ...(filter.severity && { severity: filter.severity }),
      ...((filter.after || filter.before) && {
        createdAt: {
          ...(filter.after && { gte: new Date(filter.after) }),
          ...(filter.before && { lte: new Date(filter.before) }),
        },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { pluginInstance: true },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Retrieve a single event by its unique identifier.
   *
   * @param id - Event ID.
   * @returns The event record or `null`.
   */
  async findById(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: { pluginInstance: true },
    });
  }

  /**
   * Delete events older than the retention window. Called by the daily
   * maintenance job — the events table is append-only under normal use and
   * would otherwise grow without bound.
   *
   * @param days - Number of days of history to keep.
   * @returns How many rows were removed.
   */
  async deleteOlderThan(days: number): Promise<number> {
    if (days <= 0) return 0;

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.event.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return count;
  }
}
