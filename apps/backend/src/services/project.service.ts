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
    // Scaffold the project's file tree: a conventional folder layout the user is
    // free to change, rename, or delete. The starter page lands under `pages/`,
    // with starter theme and variables files so the project runs out of the box.
    await this.scaffold(project.id, project.pages[0]);
    return project;
  }

  /** Seed content for scaffolded files (mirrors the client's file seeds). */
  private static readonly THEME_SEED =
    '/* Tema — CSS değişkenleri. Çalıştır önizlemesinde sayfaya uygulanır. */\n' +
    '--color-brand-500: #6366f1;\n' +
    '--color-bg-primary: #0a0e17;\n' +
    '--color-accent-500: #06b6d4;\n';
  private static readonly VARIABLES_SEED = '{\n  "example": "value"\n}\n';

  /**
   * Create the default folder tree and starter files for a new project. Folders
   * are a convention, not a constraint — nothing keys off their names, only off
   * file types, so the user can restructure freely afterwards.
   */
  private async scaffold(projectId: string, starterPage?: { id: string; name: string }) {
    // Root folders, in display order.
    const folders = ['pages', 'components', 'models', 'scripts', 'theme'];
    const folderId: Record<string, string> = {};
    for (let i = 0; i < folders.length; i++) {
      const node = await this.prisma.node.create({
        data: { projectId, parentId: null, kind: 'folder', name: folders[i], order: i },
      });
      folderId[folders[i]] = node.id;
    }

    // The starter page, inside `pages/`.
    if (starterPage) {
      await this.prisma.node.create({
        data: {
          projectId,
          parentId: folderId.pages,
          kind: 'page',
          name: starterPage.name,
          refId: starterPage.id,
          order: 0,
        },
      });
    }

    // Starter theme file inside `theme/`.
    await this.prisma.node.create({
      data: {
        projectId,
        parentId: folderId.theme,
        kind: 'theme',
        name: 'theme',
        order: 0,
        data: { content: ProjectService.THEME_SEED } as Prisma.InputJsonValue,
      },
    });

    // Starter variables file at the project root.
    await this.prisma.node.create({
      data: {
        projectId,
        parentId: null,
        kind: 'variables',
        name: 'variables',
        order: folders.length,
        data: { content: ProjectService.VARIABLES_SEED } as Prisma.InputJsonValue,
      },
    });
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

  /**
   * Export a project to a portable spec: its meta, its file tree, and each page's
   * blocks. Ids are replaced with temp ids so it can be re-imported anywhere.
   */
  async export(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) return null;
    const nodes = await this.prisma.node.findMany({
      where: { projectId: id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    const pages = await this.prisma.dashboard.findMany({
      where: { projectId: id },
      include: { blocks: { orderBy: { sortOrder: 'asc' } } },
    });
    const pageById = new Map(pages.map((p) => [p.id, p]));

    // Assign temp ids to nodes and map real→temp for parent/refs.
    const tempOf = new Map<string, string>();
    nodes.forEach((n, i) => {
      tempOf.set(n.id, `n${i}`);
    });

    return {
      version: 1,
      project: { name: project.name, type: project.type, description: project.description },
      nodes: nodes.map((n) => {
        const page = n.refId ? pageById.get(n.refId) : undefined;
        return {
          tempId: tempOf.get(n.id),
          parentTempId: n.parentId ? (tempOf.get(n.parentId) ?? null) : null,
          kind: n.kind,
          name: n.name,
          order: n.order,
          data: n.data,
          page: page
            ? {
                layout: page.layout,
                blocks: page.blocks.map((b) => ({
                  componentType: b.componentType,
                  title: b.title,
                  slots: b.slots,
                  options: b.options,
                  position: b.position,
                  size: b.size,
                  sortOrder: b.sortOrder,
                })),
              }
            : null,
        };
      }),
    };
  }

  /** Recreate a project from an exported spec (new ids throughout). */
  async import(ownerId: string, spec: ProjectExport) {
    const type = spec.project.type ?? 'dashboard';
    const project = await this.prisma.project.create({
      data: {
        name: spec.project.name || 'İçe aktarılan proje',
        type,
        description: spec.project.description ?? '',
        ownerId,
      },
    });

    // Create nodes parent-before-child (spec order is a stable topological-ish
    // order since children come after parents in the export), mapping temp→real.
    const realOf = new Map<string, string>();
    let pageOrder = 0;
    for (const n of spec.nodes) {
      let refId: string | null = null;
      if (n.kind === 'page' && n.page) {
        const page = await this.prisma.dashboard.create({
          data: {
            name: n.name,
            projectId: project.id,
            pageOrder: pageOrder++,
            layout: (n.page.layout ?? { projectType: type }) as Prisma.InputJsonValue,
            blocks: {
              create: (n.page.blocks ?? []).map((b, i) => ({
                componentType: b.componentType,
                title: b.title ?? '',
                slots: (b.slots ?? {}) as Prisma.InputJsonValue,
                options: (b.options ?? {}) as Prisma.InputJsonValue,
                position: (b.position ?? { x: 0, y: 0 }) as Prisma.InputJsonValue,
                size: (b.size ?? { w: 6, h: 4 }) as Prisma.InputJsonValue,
                sortOrder: b.sortOrder ?? i,
              })),
            },
          },
        });
        refId = page.id;
      }
      const created = await this.prisma.node.create({
        data: {
          projectId: project.id,
          parentId: n.parentTempId ? (realOf.get(n.parentTempId) ?? null) : null,
          kind: n.kind,
          name: n.name,
          order: n.order ?? 0,
          refId,
          data: (n.kind === 'page' ? {} : (n.data ?? {})) as Prisma.InputJsonValue,
        },
      });
      if (n.tempId) realOf.set(n.tempId, created.id);
    }

    return this.findById(project.id);
  }
}

/** The shape produced by {@link ProjectService.export}. */
export interface ProjectExport {
  version: number;
  project: { name: string; type?: string; description?: string };
  nodes: Array<{
    tempId?: string;
    parentTempId?: string | null;
    kind: string;
    name: string;
    order?: number;
    data?: unknown;
    page?: {
      layout?: unknown;
      blocks?: Array<{
        componentType: string;
        title?: string;
        slots?: unknown;
        options?: unknown;
        position?: unknown;
        size?: unknown;
        sortOrder?: number;
      }>;
    } | null;
  }>;
}
