/**
 * @fileoverview Blueprint execution engine.
 *
 * A blueprint is a small dataflow graph: `source` nodes resolve a binding into a
 * value, `transform` nodes reshape the value flowing in (limit / sort / unique /
 * aggregate / filter), and `panel` nodes are terminals that preview the result
 * and can be materialized into a real board block.
 *
 * Execution resolves every source binding in one batched request, then walks the
 * graph from each node back to its source, applying transforms along the way.
 * The engine is pure and framework-agnostic — the React Flow editor feeds it
 * plain node/edge arrays and renders the returned per-node {@link Flow}s.
 */
import { getComponent } from '@/components/design/registry';
import { resolveBindings } from '@/services/binding.service';
import type { Aggregation, Binding, BlockSlot, CompareOp, ResolvedBinding } from '@/types';

/** A value passed along an edge between nodes. */
export type Flow =
  | { kind: 'list'; list: (string | number | boolean | null)[] }
  | { kind: 'scalar'; scalar: string | number | boolean | null }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

/** Node kinds the engine understands. */
export type BpKind = 'source' | 'transform' | 'panel';

/** Reshaping operations a transform node can apply to its input. */
export type TransformOp =
  | 'limit'
  | 'sort'
  | 'unique'
  | 'count'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'filter';

/** `source` node config. */
export interface SourceData {
  title: string;
  subtitle?: string;
  /** Binding address, e.g. `gitlab:merge_request.title`. */
  ref?: string;
  /** Instance to resolve against (optional; backend defaults to the sole one). */
  instanceId?: string;
  /** Upper bound on rows read. */
  limit?: number;
  /** Reduction to a scalar (produces a single value instead of a list). */
  aggregate?: Aggregation;
}

/** `transform` node config. */
export interface TransformData {
  title: string;
  subtitle?: string;
  op?: TransformOp;
  /** `limit`: how many to keep. */
  n?: number;
  /** `sort`: direction. */
  dir?: 'asc' | 'desc';
  /** `filter`: comparison + threshold applied to each value. */
  filterOp?: CompareOp;
  value?: string;
}

/** `panel` node config (terminal). */
export interface PanelData {
  title: string;
  subtitle?: string;
  /** Design component the materialized block should use (e.g. `table`). */
  componentType?: string;
}

/** A minimal node shape the engine reads (compatible with a React Flow node). */
export interface BpNode {
  id: string;
  type?: string;
  data: Record<string, unknown>;
}

/** A minimal edge shape the engine reads (compatible with a React Flow edge). */
export interface BpEdge {
  id: string;
  source: string;
  target: string;
}

/** Turn a resolved binding into a {@link Flow}. */
function flowFromResolved(r: ResolvedBinding | undefined): Flow {
  if (!r) return { kind: 'empty' };
  if (r.error) return { kind: 'error', message: r.error };
  if (r.shape === 'scalar') return { kind: 'scalar', scalar: r.scalar ?? null };
  if (r.shape === 'series') return { kind: 'list', list: (r.series ?? []).map((p) => p.y) };
  if (r.shape === 'list') return { kind: 'list', list: [...(r.list ?? [])] };
  return { kind: 'empty' };
}

/** Coerce any flow to a flat list of values (a scalar becomes a 1-element list). */
function asList(flow: Flow): (string | number | boolean | null)[] {
  if (flow.kind === 'list') return flow.list;
  if (flow.kind === 'scalar') return [flow.scalar];
  return [];
}

/** Numeric coercion for aggregates/sorting; non-numbers become NaN. */
function num(v: string | number | boolean | null): number {
  return typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : Number.NaN;
}

/** Evaluate a filter comparison against one value. */
function matches(v: string | number | boolean | null, op: CompareOp, target: string): boolean {
  const a = String(v ?? '');
  const bn = Number(target);
  const an = num(v);
  switch (op) {
    case 'eq':
      return a === target;
    case 'neq':
      return a !== target;
    case 'contains':
      return a.toLowerCase().includes(target.toLowerCase());
    case 'lt':
      return an < bn;
    case 'lte':
      return an <= bn;
    case 'gt':
      return an > bn;
    case 'gte':
      return an >= bn;
    default:
      return true;
  }
}

/** Apply a transform node's operation to its upstream flow. */
function applyTransform(flow: Flow, d: TransformData): Flow {
  if (flow.kind === 'error') return flow;
  const list = asList(flow);
  switch (d.op) {
    case 'limit':
      return { kind: 'list', list: list.slice(0, Math.max(0, d.n ?? 10)) };
    case 'unique':
      return { kind: 'list', list: [...new Set(list)] };
    case 'sort': {
      const sorted = [...list].sort((a, b) => {
        const an = num(a);
        const bn = num(b);
        if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
        return String(a ?? '').localeCompare(String(b ?? ''));
      });
      if (d.dir === 'desc') sorted.reverse();
      return { kind: 'list', list: sorted };
    }
    case 'count':
      return { kind: 'scalar', scalar: list.length };
    case 'sum':
      return { kind: 'scalar', scalar: list.reduce<number>((s, v) => s + (num(v) || 0), 0) };
    case 'avg':
      return {
        kind: 'scalar',
        scalar: list.length ? list.reduce<number>((s, v) => s + (num(v) || 0), 0) / list.length : 0,
      };
    case 'min':
      return { kind: 'scalar', scalar: list.length ? Math.min(...list.map(num)) : null };
    case 'max':
      return { kind: 'scalar', scalar: list.length ? Math.max(...list.map(num)) : null };
    case 'filter':
      return {
        kind: 'list',
        list: list.filter((v) => matches(v, d.filterOp ?? 'contains', d.value ?? '')),
      };
    default:
      return flow;
  }
}

/**
 * Execute a blueprint graph and return each node's resolved {@link Flow}.
 * Source bindings are resolved in a single batched request; the rest is derived
 * synchronously by walking each node back to its source.
 */
export async function executeGraph(
  nodes: readonly BpNode[],
  edges: readonly BpEdge[],
): Promise<Map<string, Flow>> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    const arr = incoming.get(e.target) ?? [];
    arr.push(e.source);
    incoming.set(e.target, arr);
  }

  // Batch-resolve every source node that has a binding ref.
  const sources = nodes.filter((n) => n.type === 'source' && typeof n.data.ref === 'string');
  const bindings: Binding[] = sources.map((n) => {
    const d = n.data as unknown as SourceData;
    return {
      ref: d.ref as string,
      ...(d.instanceId ? { instanceId: d.instanceId } : {}),
      ...(typeof d.limit === 'number' ? { limit: d.limit } : {}),
      ...(d.aggregate ? { aggregate: d.aggregate } : {}),
    };
  });

  let resolved: ResolvedBinding[] = [];
  if (bindings.length > 0) {
    try {
      resolved = await resolveBindings(bindings);
    } catch (err) {
      resolved = bindings.map(() => ({
        ref: '',
        shape: 'scalar' as const,
        error: (err as Error).message,
      }));
    }
  }
  const sourceFlow = new Map<string, Flow>();
  sources.forEach((n, i) => {
    sourceFlow.set(n.id, flowFromResolved(resolved[i]));
  });

  // Resolve each node by walking to its (single) upstream source, with cycle guard.
  const memo = new Map<string, Flow>();
  const visiting = new Set<string>();
  const compute = (id: string): Flow => {
    const cached = memo.get(id);
    if (cached) return cached;
    if (visiting.has(id)) return { kind: 'error', message: 'Döngü tespit edildi' };
    visiting.add(id);

    const node = byId.get(id);
    let out: Flow;
    if (!node) {
      out = { kind: 'empty' };
    } else if (node.type === 'source') {
      out = sourceFlow.get(id) ?? { kind: 'empty' };
    } else {
      const upstreamId = incoming.get(id)?.[0];
      const upstream = upstreamId ? compute(upstreamId) : ({ kind: 'empty' } as Flow);
      out =
        node.type === 'transform'
          ? applyTransform(upstream, node.data as unknown as TransformData)
          : upstream; // panel: passthrough
    }

    visiting.delete(id);
    memo.set(id, out);
    return out;
  };

  const result = new Map<string, Flow>();
  for (const n of nodes) result.set(n.id, compute(n.id));
  return result;
}

/** A short human-readable summary of a flow, shown under a node after running. */
export function flowSummary(flow: Flow | undefined): string {
  if (!flow) return 'çalıştırılmadı';
  switch (flow.kind) {
    case 'error':
      return `hata: ${flow.message}`;
    case 'empty':
      return 'veri yok';
    case 'scalar':
      return `= ${flow.scalar ?? '—'}`;
    case 'list': {
      const preview = flow.list.slice(0, 3).map(String).join(', ');
      return `${flow.list.length} satır${preview ? ` · ${preview}${flow.list.length > 3 ? '…' : ''}` : ''}`;
    }
  }
}

/**
 * Trace a panel node back to its source and collect the transforms on the path,
 * producing the block spec (component + a single bound value) to add to a board.
 * Returns `null` when the panel has no upstream source.
 */
export function buildBlockFromPanel(
  panelId: string,
  nodes: readonly BpNode[],
  edges: readonly BpEdge[],
): { componentType: string; title: string; slots: Record<string, BlockSlot> } | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, string>();
  for (const e of edges) if (!incoming.has(e.target)) incoming.set(e.target, e.source);

  // Walk upstream collecting transforms until we reach the source node.
  const transforms: TransformData[] = [];
  let cursor: string | undefined = incoming.get(panelId);
  const seen = new Set<string>([panelId]);
  let source: (BpNode & { data: SourceData }) | undefined;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const node = byId.get(cursor);
    if (!node) break;
    if (node.type === 'source') {
      source = node as BpNode & { data: SourceData };
      break;
    }
    if (node.type === 'transform') transforms.push(node.data as unknown as TransformData);
    cursor = incoming.get(cursor);
  }

  if (!source?.data.ref) return null;

  // Fold path transforms into binding params where the backend can honour them.
  const limitT = transforms.find((t) => t.op === 'limit');
  const aggT = transforms.find(
    (t) => t.op === 'count' || t.op === 'sum' || t.op === 'avg' || t.op === 'min' || t.op === 'max',
  );
  const binding: Binding = {
    ref: source.data.ref,
    ...(source.data.instanceId ? { instanceId: source.data.instanceId } : {}),
    ...(limitT?.n ? { limit: limitT.n } : source.data.limit ? { limit: source.data.limit } : {}),
    ...(aggT
      ? { aggregate: aggT.op as Aggregation }
      : source.data.aggregate
        ? { aggregate: source.data.aggregate }
        : {}),
  };

  const panel = byId.get(panelId);
  const componentType = (panel?.data as unknown as PanelData)?.componentType || 'table';
  const descriptor = getComponent(componentType)?.descriptor;
  const slotKey = descriptor?.slots[0]?.key ?? 'columns';
  const label = source.data.ref.split('.').pop() ?? source.data.ref;

  return {
    componentType,
    title: (panel?.data as unknown as PanelData)?.title || label,
    slots: {
      [slotKey]: { values: [{ id: `bp-${Date.now()}`, binding, label }] },
    },
  };
}
