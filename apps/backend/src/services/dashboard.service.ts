/**
 * @file Dashboard (page) service.
 *
 * A dashboard is a design-layer page: a grid of {@link DashboardBlock}s. Blocks
 * are component instances whose slots hold cross-source bindings; there is no
 * direct plugin-instance coupling at the persistence layer. Kept named
 * "dashboard" for broadcast/live compatibility.
 */

import type { Prisma, PrismaClient } from '@prisma/client';

/** Input for creating/replacing a block on a page. */
export interface BlockInput {
  componentType: string;
  title?: string;
  slots?: Record<string, unknown>;
  options?: Record<string, unknown>;
  position?: Record<string, unknown>;
  size?: Record<string, unknown>;
  sortOrder?: number;
}

/** Input for creating a new dashboard. */
export interface CreateDashboardInput {
  name: string;
  description?: string;
  layout?: Record<string, unknown>;
  isDefault?: boolean;
  blocks?: BlockInput[];
}

/** Input for updating an existing dashboard. */
export interface UpdateDashboardInput {
  name?: string;
  description?: string;
  layout?: Record<string, unknown>;
  isDefault?: boolean;
  blocks?: BlockInput[];
}

/** Prisma include that returns a dashboard with its ordered blocks. */
const withBlocks = {
  blocks: { orderBy: { sortOrder: 'asc' } },
} as const satisfies Prisma.DashboardInclude;

/** Map a {@link BlockInput} to a Prisma nested-create record. */
function toBlockCreate(
  block: BlockInput,
  index: number,
): Prisma.DashboardBlockCreateWithoutDashboardInput {
  return {
    componentType: block.componentType,
    title: block.title ?? '',
    slots: (block.slots ?? {}) as Prisma.InputJsonValue,
    options: (block.options ?? {}) as Prisma.InputJsonValue,
    position: (block.position ?? { x: 0, y: 0 }) as Prisma.InputJsonValue,
    size: (block.size ?? { w: 6, h: 4 }) as Prisma.InputJsonValue,
    sortOrder: block.sortOrder ?? index,
  };
}

/**
 * Service responsible for dashboard (page) and block persistence.
 */
export class DashboardService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Create a new dashboard with optional embedded blocks. */
  async create(input: CreateDashboardInput) {
    return this.prisma.dashboard.create({
      data: {
        name: input.name,
        description: input.description ?? '',
        layout: (input.layout ?? {}) as Prisma.InputJsonValue,
        isDefault: input.isDefault ?? false,
        blocks: input.blocks ? { create: input.blocks.map(toBlockCreate) } : undefined,
      },
      include: withBlocks,
    });
  }

  /**
   * Update a dashboard. When `blocks` is provided the existing set is replaced
   * wholesale (delete + create) within a transaction.
   */
  async update(id: string, input: UpdateDashboardInput) {
    return this.prisma.$transaction(async (tx) => {
      if (input.blocks) {
        await tx.dashboardBlock.deleteMany({ where: { dashboardId: id } });
      }

      return tx.dashboard.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.layout !== undefined && { layout: input.layout as Prisma.InputJsonValue }),
          ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
          ...(input.blocks && { blocks: { create: input.blocks.map(toBlockCreate) } }),
        },
        include: withBlocks,
      });
    });
  }

  /** Delete a dashboard and all of its blocks. */
  async delete(id: string) {
    return this.prisma.dashboard.delete({ where: { id } });
  }

  /** Retrieve all dashboards with their blocks. */
  async findAll() {
    return this.prisma.dashboard.findMany({
      orderBy: { createdAt: 'desc' },
      include: withBlocks,
    });
  }

  /** Retrieve a single dashboard by id. */
  async findById(id: string) {
    return this.prisma.dashboard.findUnique({ where: { id }, include: withBlocks });
  }
}
