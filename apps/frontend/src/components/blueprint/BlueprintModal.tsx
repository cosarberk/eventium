/**
 * @fileoverview Blueprint modal (heavy) — the React Flow editor surface.
 * Kept in its own module so it is code-split and only loaded when the user
 * opens the Blueprint (see BlueprintEditor's lazy import).
 *
 * Beyond drawing the graph, the editor runs it: sources resolve their bindings,
 * transforms reshape the flow, and each node shows a live result summary. A
 * panel node can be materialized into a real board block, and the whole graph is
 * saved to / loaded from the persistent blueprint store.
 */
import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { listComponentDescriptors } from '@/components/design/registry';
import { useDashboardStore } from '@/storage/dashboard.store';
import type { Aggregation, CompareOp } from '@/types';
import { useBlueprintStore } from './blueprint.store';
import {
  type BpEdge,
  type BpNode,
  buildBlockFromPanel,
  executeGraph,
  flowSummary,
  type PanelData,
  type SourceData,
  type TransformData,
  type TransformOp,
} from './engine';

const KIND_STYLE: Record<string, { ring: string; chip: string; label: string }> = {
  source: { ring: 'border-brand-500/60', chip: 'bg-brand-500/15 text-brand-500', label: 'Kaynak' },
  transform: {
    ring: 'border-accent-500/60',
    chip: 'bg-accent-500/15 text-accent-600',
    label: 'Transform',
  },
  panel: {
    ring: 'border-emerald-500/60',
    chip: 'bg-emerald-500/15 text-emerald-500',
    label: 'Panel',
  },
};

function NodeCard({
  kind,
  title,
  subtitle,
  hasIn,
  hasOut,
}: {
  kind: string;
  title: string;
  subtitle?: string;
  hasIn: boolean;
  hasOut: boolean;
}) {
  const s = KIND_STYLE[kind] ?? KIND_STYLE.transform;
  return (
    <div
      className={`min-w-[168px] rounded-xl border ${s?.ring} bg-[var(--color-bg-elevated)] shadow-md`}
    >
      {hasIn && (
        <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-brand-500" />
      )}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-primary)] px-3 py-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${s?.chip}`}
        >
          {s?.label}
        </span>
        <span className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
          {title}
        </span>
      </div>
      <div className="px-3 py-2 text-[11px] text-[var(--color-text-tertiary)]">
        {subtitle ?? 'Yapılandırmak için seç'}
      </div>
      {hasOut && (
        <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-brand-500" />
      )}
    </div>
  );
}

type NodeData = { title: string; subtitle?: string };
function SourceNode({ data }: NodeProps) {
  const d = data as NodeData;
  return <NodeCard kind="source" title={d.title} subtitle={d.subtitle} hasIn={false} hasOut />;
}
function TransformNode({ data }: NodeProps) {
  const d = data as NodeData;
  return <NodeCard kind="transform" title={d.title} subtitle={d.subtitle} hasIn hasOut />;
}
function PanelNode({ data }: NodeProps) {
  const d = data as NodeData;
  return <NodeCard kind="panel" title={d.title} subtitle={d.subtitle} hasIn hasOut={false} />;
}
const nodeTypes = { source: SourceNode, transform: TransformNode, panel: PanelNode };

const DEFAULT_NODES: Node[] = [
  {
    id: 'n1',
    type: 'source',
    position: { x: 40, y: 120 },
    data: { title: 'GitLab', ref: 'gitlab:merge_request.title', limit: 20 },
  },
  {
    id: 'n2',
    type: 'transform',
    position: { x: 340, y: 120 },
    data: { title: 'İlk 10', op: 'limit', n: 10 },
  },
  {
    id: 'n3',
    type: 'panel',
    position: { x: 640, y: 120 },
    data: { title: 'Tablo', componentType: 'table' },
  },
];
const DEFAULT_EDGES: Edge[] = [
  { id: 'e1', source: 'n1', target: 'n2', animated: true },
  { id: 'e2', source: 'n2', target: 'n3', animated: true },
];

let idc = 100;
const nextId = () => `n${idc++}`;

const AGGREGATES: Aggregation[] = ['count', 'sum', 'avg', 'min', 'max', 'first', 'latest'];
const TRANSFORM_OPS: TransformOp[] = [
  'limit',
  'sort',
  'unique',
  'count',
  'sum',
  'avg',
  'min',
  'max',
  'filter',
];
const COMPARE_OPS: CompareOp[] = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains'];

const fieldCls =
  'w-full rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40';
const labelCls =
  'mb-1 block text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]';

function Editor({ onClose }: { onClose?: () => void }) {
  const saved = useBlueprintStore;
  const initial = saved.getState();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    initial.nodes && initial.nodes.length > 0 ? (initial.nodes as Node[]) : DEFAULT_NODES,
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initial.edges && initial.edges.length > 0 ? (initial.edges as Edge[]) : DEFAULT_EDGES,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const persist = useBlueprintStore((s) => s.save);
  const clearSaved = useBlueprintStore((s) => s.clear);
  const addBlockWithSlots = useDashboardStore((s) => s.addBlockWithSlots);
  const hasActiveBoard = useDashboardStore((s) => Boolean(s.activeDashboard));

  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const componentTypes = listComponentDescriptors().map((d) => d.type);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)),
    [setEdges],
  );

  const addNode = (kind: 'source' | 'transform' | 'panel') => {
    const titles = { source: 'Kaynak', transform: 'Transform', panel: 'Panel' };
    const id = nextId();
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: kind,
        position: { x: 140 + Math.random() * 260, y: 80 + Math.random() * 220 },
        data:
          kind === 'panel'
            ? { title: titles[kind], componentType: 'table' }
            : kind === 'transform'
              ? { title: titles[kind], op: 'limit', n: 10 }
              : { title: titles[kind] },
      },
    ]);
    setSelectedId(id);
  };

  /** Update the selected node's data. */
  const patch = (p: Record<string, unknown>) =>
    setNodes((ns) =>
      ns.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...p } } : n)),
    );

  /** Run the graph and write each node's result summary back as its subtitle. */
  const run = async () => {
    setRunning(true);
    try {
      const results = await executeGraph(nodes as BpNode[], edges as BpEdge[]);
      setNodes((ns) =>
        ns.map((n) => ({ ...n, data: { ...n.data, subtitle: flowSummary(results.get(n.id)) } })),
      );
    } catch (err) {
      toast.error(`Çalıştırma hatası: ${(err as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  const materialize = (panelId: string) => {
    if (!hasActiveBoard) {
      toast.error('Önce bir board açın (Boards).');
      return;
    }
    const spec = buildBlockFromPanel(panelId, nodes as BpNode[], edges as BpEdge[]);
    if (!spec) {
      toast.error('Panel bir kaynağa bağlı olmalı.');
      return;
    }
    addBlockWithSlots(spec.componentType, spec.slots, {}, spec.title);
    toast.success("Panel board'a eklendi");
    onClose?.();
  };

  const doSave = () => {
    persist(nodes, edges);
    toast.success('Blueprint kaydedildi');
  };
  const doReset = () => {
    clearSaved();
    setNodes(DEFAULT_NODES);
    setEdges(DEFAULT_EDGES);
    setSelectedId(null);
    toast.success('Başlangıç blueprint’ine dönüldü');
  };

  return (
    <div className="relative flex h-full w-full">
      <div className="relative min-w-0 flex-1">
        {/* Toolbar */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]/90 p-1 backdrop-blur">
          {(['source', 'transform', 'panel'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => addNode(k)}
              className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              + {KIND_STYLE[k]?.label}
            </button>
          ))}
          <div className="mx-1 w-px bg-[var(--color-border-primary)]" />
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="rounded-md bg-brand-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {running ? 'Çalışıyor…' : '▶ Çalıştır'}
          </button>
          <button
            type="button"
            onClick={doSave}
            className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={doReset}
            className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-red-500 transition-colors"
          >
            Sıfırla
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--color-border-primary)"
          />
          <Controls className="!bg-[var(--color-bg-elevated)] !border !border-[var(--color-border-primary)]" />
          <MiniMap
            pannable
            zoomable
            className="!bg-[var(--color-bg-secondary)] !border !border-[var(--color-border-primary)]"
          />
        </ReactFlow>
      </div>

      {/* Node inspector */}
      {selected && (
        <div className="w-64 shrink-0 space-y-3 overflow-y-auto border-l border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-primary)]">
              {KIND_STYLE[selected.type ?? 'transform']?.label} düğümü
            </span>
            <button
              type="button"
              onClick={() => setNodes((ns) => ns.filter((n) => n.id !== selected.id))}
              className="text-[10px] font-medium text-[var(--color-text-tertiary)] hover:text-red-500"
            >
              Sil
            </button>
          </div>

          <label className="block">
            <span className={labelCls}>Başlık</span>
            <input
              className={fieldCls}
              value={(selected.data as NodeData).title ?? ''}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>

          {selected.type === 'source' && (
            <SourceFields data={selected.data as unknown as SourceData} patch={patch} />
          )}
          {selected.type === 'transform' && (
            <TransformFields data={selected.data as unknown as TransformData} patch={patch} />
          )}
          {selected.type === 'panel' && (
            <PanelFields
              data={selected.data as unknown as PanelData}
              componentTypes={componentTypes}
              patch={patch}
              onMaterialize={() => materialize(selected.id)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Config fields for a source node. */
function SourceFields({
  data,
  patch,
}: {
  data: SourceData;
  patch: (p: Record<string, unknown>) => void;
}) {
  return (
    <>
      <label className="block">
        <span className={labelCls}>Binding (sourceType:entity.field)</span>
        <input
          className={`${fieldCls} font-mono`}
          placeholder="gitlab:merge_request.title"
          value={data.ref ?? ''}
          onChange={(e) => patch({ ref: e.target.value || undefined })}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Instance id (opsiyonel)</span>
        <input
          className={fieldCls}
          value={data.instanceId ?? ''}
          onChange={(e) => patch({ instanceId: e.target.value || undefined })}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Limit</span>
        <input
          type="number"
          className={fieldCls}
          value={data.limit ?? ''}
          onChange={(e) => patch({ limit: e.target.value ? Number(e.target.value) : undefined })}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Aggregate (opsiyonel)</span>
        <select
          className={fieldCls}
          value={data.aggregate ?? ''}
          onChange={(e) => patch({ aggregate: (e.target.value || undefined) as Aggregation })}
        >
          <option value="">Yok (liste)</option>
          {AGGREGATES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

/** Config fields for a transform node. */
function TransformFields({
  data,
  patch,
}: {
  data: TransformData;
  patch: (p: Record<string, unknown>) => void;
}) {
  const op = data.op ?? 'limit';
  return (
    <>
      <label className="block">
        <span className={labelCls}>İşlem</span>
        <select
          className={fieldCls}
          value={op}
          onChange={(e) => patch({ op: e.target.value as TransformOp })}
        >
          {TRANSFORM_OPS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>

      {op === 'limit' && (
        <label className="block">
          <span className={labelCls}>Adet</span>
          <input
            type="number"
            className={fieldCls}
            value={data.n ?? ''}
            onChange={(e) => patch({ n: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
      )}
      {op === 'sort' && (
        <label className="block">
          <span className={labelCls}>Yön</span>
          <select
            className={fieldCls}
            value={data.dir ?? 'asc'}
            onChange={(e) => patch({ dir: e.target.value as 'asc' | 'desc' })}
          >
            <option value="asc">Artan</option>
            <option value="desc">Azalan</option>
          </select>
        </label>
      )}
      {op === 'filter' && (
        <>
          <label className="block">
            <span className={labelCls}>Karşılaştırma</span>
            <select
              className={fieldCls}
              value={data.filterOp ?? 'contains'}
              onChange={(e) => patch({ filterOp: e.target.value as CompareOp })}
            >
              {COMPARE_OPS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Değer</span>
            <input
              className={fieldCls}
              value={data.value ?? ''}
              onChange={(e) => patch({ value: e.target.value })}
            />
          </label>
        </>
      )}
    </>
  );
}

/** Config fields for a panel node, plus the materialize action. */
function PanelFields({
  data,
  componentTypes,
  patch,
  onMaterialize,
}: {
  data: PanelData;
  componentTypes: string[];
  patch: (p: Record<string, unknown>) => void;
  onMaterialize: () => void;
}) {
  return (
    <>
      <label className="block">
        <span className={labelCls}>Bileşen</span>
        <select
          className={fieldCls}
          value={data.componentType ?? 'table'}
          onChange={(e) => patch({ componentType: e.target.value })}
        >
          {componentTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onMaterialize}
        className="w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
      >
        Panele ekle (board'a)
      </button>
      <p className="text-[10px] text-[var(--color-text-tertiary)]">
        Kaynak → transform zincirini aktif board'a gerçek bir panel olarak ekler.
      </p>
    </>
  );
}

/**
 * Reusable blueprint editor surface (React Flow provider + editor). Used both by
 * the modal and inline inside a component's editor tab.
 */
export function BlueprintCanvas({ onClose }: { onClose?: () => void }) {
  return (
    <ReactFlowProvider>
      <Editor onClose={onClose} />
    </ReactFlowProvider>
  );
}

/** The Blueprint modal (default export for lazy loading). */
export default function BlueprintModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative flex h-[82vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shadow-xl"
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border-primary)] px-4 h-header shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Blueprint</h2>
            <p className="text-[11px] text-[var(--color-text-tertiary)]">
              Kaynak → transform → panel: akışı bağla, çalıştır, board'a bas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <BlueprintCanvas onClose={onClose} />
        </div>
      </motion.div>
    </div>
  );
}
