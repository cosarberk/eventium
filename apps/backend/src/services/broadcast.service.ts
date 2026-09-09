/**
 * @file Broadcast link service.
 * Manages CRUD operations for broadcast links that expose dashboards
 * publicly via unique tokens.
 */

import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/index.js';

/** Input shape for creating a broadcast link. */
export interface CreateBroadcastLinkInput {
  name: string;
  dashboardIds: string[];
}

/** Input shape for updating a broadcast link. */
export interface UpdateBroadcastLinkInput {
  name?: string;
  enabled?: boolean;
  dashboardIds?: string[];
}

/**
 * Service responsible for broadcast link lifecycle management.
 * Each broadcast link exposes one or more dashboards via a unique token
 * that can be shared publicly without authentication.
 */
export class BroadcastService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Retrieve all broadcast links created by a specific user.
   *
   * @param userId - The ID of the user who owns the links.
   * @returns Array of broadcast links with associated dashboards.
   */
  async findAll(userId: string) {
    return this.prisma.broadcastLink.findMany({
      where: { createdBy: userId },
      include: {
        dashboards: {
          include: { dashboard: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieve a broadcast link by its public token.
   * Used for unauthenticated public access. Only returns enabled links.
   *
   * @param token - The unique token identifying the broadcast link.
   * @returns The broadcast link with dashboards and panels, or null.
   */
  async findByToken(token: string) {
    return this.prisma.broadcastLink.findFirst({
      where: { token, enabled: true },
      include: {
        dashboards: {
          include: {
            dashboard: {
              include: { blocks: { orderBy: { sortOrder: 'asc' } } },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Collect the set of binding addresses a public broadcast is allowed to
   * resolve: exactly those declared by the blocks on its dashboards.
   *
   * Without this, holding a broadcast token would let a caller resolve *any*
   * binding against *any* installed source — turning a link meant to show one
   * wall board into a read-anything API.
   *
   * @param token - The public broadcast token.
   * @returns Allowed keys as `ref` and `ref@instanceId`, or `null` when the
   *          token is unknown or disabled.
   */
  async allowedBindingKeys(token: string): Promise<Set<string> | null> {
    const link = await this.findByToken(token);
    if (!link) return null;

    const allowed = new Set<string>();

    for (const entry of link.dashboards) {
      for (const block of entry.dashboard.blocks) {
        const slots = (block.slots ?? {}) as Record<
          string,
          { values?: Array<{ binding?: { ref?: string; instanceId?: string } }> }
        >;
        for (const slot of Object.values(slots)) {
          for (const value of slot.values ?? []) {
            const ref = value.binding?.ref;
            if (!ref) continue;
            allowed.add(ref);
            if (value.binding?.instanceId) {
              allowed.add(`${ref}@${value.binding.instanceId}`);
            }
          }
        }
      }
    }

    return allowed;
  }

  /**
   * The data-source types a public broadcast legitimately displays, derived from
   * its blocks' binding refs. Used to decide which live events a token-holding
   * wall display may receive.
   *
   * @param token - The public broadcast token.
   * @returns Source types (e.g. `gitlab`), or `null` for an unknown token.
   */
  async allowedSourceTypes(token: string): Promise<Set<string> | null> {
    const keys = await this.allowedBindingKeys(token);
    if (!keys) return null;

    const types = new Set<string>();
    for (const key of keys) {
      const sourceType = key.split(':')[0];
      if (sourceType) types.add(sourceType);
    }
    return types;
  }

  /**
   * Create a new broadcast link with auto-generated token.
   *
   * @param userId - The ID of the user creating the link.
   * @param input  - Name and dashboard IDs for the new link.
   * @returns The newly created broadcast link.
   */
  async create(userId: string, input: CreateBroadcastLinkInput) {
    return this.prisma.broadcastLink.create({
      data: {
        token: randomUUID(),
        name: input.name,
        createdBy: userId,
        dashboards: {
          create: input.dashboardIds.map((dashboardId, index) => ({
            dashboardId,
            sortOrder: index,
          })),
        },
      },
      include: {
        dashboards: {
          include: { dashboard: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Update an existing broadcast link.
   * Only the owner can update their own links.
   *
   * @param id     - The broadcast link ID.
   * @param userId - The ID of the user performing the update.
   * @param input  - Fields to update.
   * @returns The updated broadcast link.
   * @throws Error if the link is not found or not owned by the user.
   */
  async update(id: string, userId: string, input: UpdateBroadcastLinkInput) {
    const existing = await this.prisma.broadcastLink.findFirst({
      where: { id, createdBy: userId },
    });

    if (!existing) {
      throw new NotFoundError('Broadcast link not found');
    }

    return this.prisma.$transaction(async (tx) => {
      if (input.dashboardIds !== undefined) {
        await tx.broadcastLinkDashboard.deleteMany({
          where: { broadcastLinkId: id },
        });

        if (input.dashboardIds.length > 0) {
          await tx.broadcastLinkDashboard.createMany({
            data: input.dashboardIds.map((dashboardId, index) => ({
              broadcastLinkId: id,
              dashboardId,
              sortOrder: index,
            })),
          });
        }
      }

      return tx.broadcastLink.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.enabled !== undefined && { enabled: input.enabled }),
        },
        include: {
          dashboards: {
            include: { dashboard: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });
  }

  /**
   * Delete a broadcast link.
   * Only the owner can delete their own links.
   *
   * @param id     - The broadcast link ID.
   * @param userId - The ID of the user performing the deletion.
   * @returns The deleted broadcast link.
   * @throws Error if the link is not found or not owned by the user.
   */
  async delete(id: string, userId: string) {
    const existing = await this.prisma.broadcastLink.findFirst({
      where: { id, createdBy: userId },
    });

    if (!existing) {
      throw new NotFoundError('Broadcast link not found');
    }

    return this.prisma.broadcastLink.delete({
      where: { id },
      include: {
        dashboards: {
          include: { dashboard: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Regenerate the public token for an existing broadcast link.
   * Invalidates the old token immediately.
   *
   * @param id     - The broadcast link ID.
   * @param userId - The ID of the user performing the regeneration.
   * @returns The broadcast link with the new token.
   * @throws Error if the link is not found or not owned by the user.
   */
  async regenerateToken(id: string, userId: string) {
    const existing = await this.prisma.broadcastLink.findFirst({
      where: { id, createdBy: userId },
    });

    if (!existing) {
      throw new NotFoundError('Broadcast link not found');
    }

    return this.prisma.broadcastLink.update({
      where: { id },
      data: { token: randomUUID() },
      include: {
        dashboards: {
          include: { dashboard: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }
}
