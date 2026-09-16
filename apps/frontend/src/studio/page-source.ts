/**
 * @fileoverview Page Source codec — the whole page as one canonical, editable
 * spec (not just one component).
 *
 * Projects the active page to a single document: meta (name, type), design
 * settings (layout mode, grid columns), runtime variables, every block (with its
 * options & bindings), and the blueprint component-links. Editing this JSON
 * writes the parts back to the model (blocks, variables), so Code becomes a true
 * "view source" of the entire page — two-way, one source of truth.
 */
import type { BlockSlot } from '@eventium/shared';
import type { Dashboard, DashboardBlock } from '@/types';

/** A block as it appears in the page source. */
interface SourceBlock {
  id: string;
  type: string;
  title: string;
  frame?: { x: number; y: number; w: number; h: number };
  options: Record<string, unknown>;
  slots: Record<string, BlockSlot>;
}

/** The whole-page canonical spec. */
export interface PageSource {
  meta: { id: string; name: string; type: string };
  design: { layoutMode: string; columns: number };
  variables: Record<string, string>;
  blocks: SourceBlock[];
  links: { id: string; source: string; target: string }[];
}

function layoutField<T>(layout: unknown, key: string, fallback: T): T {
  if (layout && typeof layout === 'object' && key in (layout as Record<string, unknown>)) {
    return (layout as Record<string, T>)[key] ?? fallback;
  }
  return fallback;
}

/** Project the active page to its canonical source. */
export function pageToSource(page: Dashboard, variables: Record<string, string>): PageSource {
  const layout = page.layout ?? {};
  return {
    meta: {
      id: page.id,
      name: page.name,
      type: layoutField(layout, 'projectType', 'dashboard'),
    },
    design: {
      layoutMode: layoutField(layout, 'layoutMode', 'grid'),
      columns: layoutField(layout, 'columns', 12),
    },
    variables,
    blocks: page.blocks.map((b) => {
      const frame = (b.options as { frame?: SourceBlock['frame'] }).frame;
      const { frame: _omit, ...options } = b.options as Record<string, unknown>;
      return {
        id: b.id,
        type: b.componentType,
        title: b.title,
        ...(frame ? { frame } : {}),
        options,
        slots: b.slots,
      };
    }),
    links: layoutField(layout, 'blueprintEdges', [] as PageSource['links']),
  };
}

/** Serialize the page to pretty source JSON. */
export function pageSourceJson(page: Dashboard, variables: Record<string, string>): string {
  return JSON.stringify(pageToSource(page, variables), null, 2);
}

/** Parse edited source JSON back into a validated {@link PageSource}. */
export function parsePageSource(
  json: string,
): { ok: true; source: PageSource } | { ok: false; error: string } {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (typeof value !== 'object' || value === null) {
    return { ok: false, error: 'Bir JSON nesnesi bekleniyor.' };
  }
  const v = value as Partial<PageSource>;
  if (!Array.isArray(v.blocks)) return { ok: false, error: '"blocks" bir dizi olmalı.' };
  return {
    ok: true,
    source: {
      meta: { id: v.meta?.id ?? '', name: v.meta?.name ?? '', type: v.meta?.type ?? 'dashboard' },
      design: {
        layoutMode: v.design?.layoutMode ?? 'grid',
        columns: v.design?.columns ?? 12,
      },
      variables: v.variables ?? {},
      blocks: v.blocks as SourceBlock[],
      links: Array.isArray(v.links) ? v.links : [],
    },
  };
}

/** Rebuild the model blocks array from an edited source. */
export function sourceToBlocks(source: PageSource): DashboardBlock[] {
  return source.blocks.map((b, i) => ({
    id: b.id || `block-${Date.now()}-${i}`,
    componentType: b.type,
    title: b.title ?? '',
    slots: b.slots ?? {},
    options: b.frame ? { ...b.options, frame: b.frame } : { ...b.options },
    position: { x: 0, y: i },
    size: {
      w: b.frame ? Math.max(1, Math.round(b.frame.w / 80)) : 6,
      h: b.frame ? Math.max(1, Math.round(b.frame.h / 60)) : 4,
    },
    sortOrder: i,
  }));
}
