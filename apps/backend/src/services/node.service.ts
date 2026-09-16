/**
 * @file Project tree (node) service.
 *
 * A project owns a dynamic file-system tree: folders and typed files (page,
 * blueprint, datasource, script, component, variables, theme…). `kind` is an
 * opaque string resolved to an extension/editor by the frontend registry, so new
 * file types need no backend change. A `page` node owns a Dashboard (its design);
 * other kinds keep content in `data`.
 */
import type { Prisma, PrismaClient } from '@prisma/client';

/** Input for creating a node (folder or file). */
export interface CreateNodeInput {
  projectId: string;
  parentId?: string | null;
  kind: string;
  name: string;
}

type NodeRow = { id: string; parentId: string | null; kind: string; refId: string | null };

/** Collect a node id plus all of its descendant ids from a flat list. */
function descendantIds(all: NodeRow[], rootId: string): string[] {
  const byParent = new Map<string | null, NodeRow[]>();
  for (const n of all) {
    const list = byParent.get(n.parentId) ?? [];
    list.push(n);
    byParent.set(n.parentId, list);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    if (!id) continue;
    out.push(id);
    for (const child of byParent.get(id) ?? []) stack.push(child.id);
  }
  return out;
}

/** Service for a project's file-system tree. */
export class NodeService {
  constructor(private readonly prisma: PrismaClient) {}

  /** All nodes in a project (flat; the client assembles the tree by parentId). */
  listForProject(projectId: string) {
    return this.prisma.node.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Create a folder or a typed file. A `page` file also creates its Dashboard
   * (the design surface) and links it via `refId`.
   */
  async create(input: CreateNodeInput) {
    const { projectId, kind, name } = input;
    const parentId = input.parentId ?? null;
    const order = await this.prisma.node.count({ where: { projectId, parentId } });

    let refId: string | null = null;
    if (kind === 'page') {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      const page = await this.prisma.dashboard.create({
        data: {
          name,
          projectId,
          pageOrder: order,
          layout: { projectType: project?.type ?? 'dashboard' } as Prisma.InputJsonValue,
        },
      });
      refId = page.id;
    }

    return this.prisma.node.create({
      data: { projectId, parentId, kind, name, order, refId, data: {} },
    });
  }

  /** Rename a node (and its linked page, if any). */
  async rename(id: string, name: string) {
    return this.prisma.$transaction(async (tx) => {
      const node = await tx.node.update({ where: { id }, data: { name } });
      if (node.kind === 'page' && node.refId) {
        await tx.dashboard.update({ where: { id: node.refId }, data: { name } }).catch(() => {});
      }
      return node;
    });
  }

  /** Move a node under a new parent at a given order. */
  move(id: string, parentId: string | null, order: number) {
    return this.prisma.node.update({ where: { id }, data: { parentId, order } });
  }

  /** Replace a node's content JSON (for non-page files). */
  setData(id: string, data: Record<string, unknown>) {
    return this.prisma.node.update({
      where: { id },
      data: { data: data as Prisma.InputJsonValue },
    });
  }

  /** Delete a node, its descendants, and any Dashboards owned by page nodes. */
  async delete(id: string) {
    const node = await this.prisma.node.findUnique({ where: { id } });
    if (!node) return null;
    const all = await this.prisma.node.findMany({
      where: { projectId: node.projectId },
      select: { id: true, parentId: true, kind: true, refId: true },
    });
    const ids = descendantIds(all, id);
    const pageRefs = all
      .filter((n) => ids.includes(n.id) && n.kind === 'page' && n.refId)
      .map((n) => n.refId as string);
    return this.prisma.$transaction(async (tx) => {
      if (pageRefs.length) await tx.dashboard.deleteMany({ where: { id: { in: pageRefs } } });
      // The node's children cascade via the self-relation FK.
      return tx.node.delete({ where: { id } });
    });
  }
}
