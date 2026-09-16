/**
 * @file Project service.
 *
 * A project is the top-level unit that owns pages (dashboards), like a Visual
 * Studio solution or a Figma file. It carries the project type that focuses the
 * editor. Pages are `Dashboard` rows linked by `projectId`; block/page editing
 * still flows through {@link DashboardService}. This service owns the project
 * root and page membership only.
 */

import type { Prisma, PrismaClient } from '@prisma/client';

/** Include that returns a page with its ordered blocks. */
const pageWithBlocks = {
  blocks: { orderBy: { sortOrder: 'asc' } },
} as const satisfies Prisma.DashboardInclude;

/** Include that returns a project with its ordered pages (and their blocks). */
const withPages = {
  pages: { orderBy: { pageOrder: 'asc' }, include: pageWithBlocks },
} as const satisfies Prisma.ProjectInclude;

/** Input for creating a project. */
export interface CreateProjectInput {
  name: string;
  type?: string;
  description?: string;
}

/** Input for updating a project. */
export interface UpdateProjectInput {
  name?: string;
  type?: string;
  description?: string;
}

/** Service responsible for project roots and their page membership. */
export class ProjectService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Create a project with one empty starter page, owned by `ownerId`. */
  async create(ownerId: string, input: CreateProjectInput) {
    const type = input.type ?? 'dashboard';
    const project = await this.prisma.project.create({
      data: {
        name: input.name,
        type,
        description: input.description ?? '',
        ownerId,
        pages: {
          create: [
            {
              name: input.name,
              layout: { projectType: type } as Prisma.InputJsonValue,
              isDefault: true,
              pageOrder: 0,
            },
          ],
        },
      },
      include: withPages,
    });
    // Also add the starter page to the project's file tree as a `page` node, so
    // it shows in the Project Explorer just like any other file.
    const starter = project.pages[0];
    if (starter) {
      await this.prisma.node.create({
        data: {
          projectId: project.id,
          kind: 'page',
          name: starter.name,
          refId: starter.id,
          order: 0,
        },
      });
    }
    return project;
  }

  /**
   * List all projects, newest first, with their pages. Visibility is not
   * owner-scoped yet (mirrors the flat dashboard listing); ownership is stored
   * for when multi-tenancy is turned on.
   */
  async findAll() {
    return this.prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: withPages,
    });
  }

  /** List the projects owned by a user, newest first, with their pages. */
  async findAllForOwner(ownerId: string) {
    return this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      include: withPages,
    });
  }

  /** Retrieve a single project with its pages. */
  async findById(id: string) {
    return this.prisma.project.findUnique({ where: { id }, include: withPages });
  }

  /** Update a project's name/type/description. */
  async update(id: string, input: UpdateProjectInput) {
    return this.prisma.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.description !== undefined && { description: input.description }),
      },
      include: withPages,
    });
  }

  /** Delete a project and (by cascade) all of its pages and their blocks. */
  async delete(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }

  /** Add a new empty page to a project; ordered after existing pages. */
  async createPage(projectId: string, name: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    const type = project?.type ?? 'dashboard';
    const count = await this.prisma.dashboard.count({ where: { projectId } });
    return this.prisma.dashboard.create({
      data: {
        name,
        projectId,
        pageOrder: count,
        layout: { projectType: type } as Prisma.InputJsonValue,
      },
      include: pageWithBlocks,
    });
  }
}
