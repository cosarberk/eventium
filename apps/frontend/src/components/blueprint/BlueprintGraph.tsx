/**
 * @fileoverview Blueprint — a live component graph of the page.
 *
 * Every block on the page is a node here; the graph is just another view of the
 * same source of truth. Adding a node creates a component (and its code/design);
 * dragging a node moves the component on the canvas; deleting a node deletes the
 * block; connecting two nodes records a component→component link on the page.
 * Clicking a node selects it so the Inspector and Code follow.
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
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { parseFieldRef } from '@eventium/shared';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { getComponent, listComponentDescriptors } from '@/components/design/registry';
import { useDashboardStore } from '@/storage/dashboard.store';
import type { DashboardBlock } from '@/types';

const DEFAULT_W = 220;
const DEFAULT_H = 90;

/** A block's blueprint position/size (from its free-canvas frame, or derived). */
function frameXY(b: DashboardBlock): { x: number; y: number; w: number; h: number } {
  const fr = b.options.frame as { x?: number; y?: number; w?: number; h?: number } | undefined;
  return {
    x: typeof fr?.x === 'number' ? fr.x : b.position.x * 90 + 40,
    y: typeof fr?.y === 'number' ? fr.y : b.position.y * 80 + 40,
    w: typeof fr?.w === 'number' ? fr.w : DEFAULT_W,
    h: typeof fr?.h === 'number' ? fr.h : DEFAULT_H,
  };
}

/** Project the page's blocks to graph nodes. */
function blocksToNodes(blocks: readonly DashboardBlock[], selectedId: string | null): Node[] {
  return blocks.map((b) => {
    const d = getComponent(b.componentType)?.descriptor;
    const f = frameXY(b);
    return {
      id: b.id,
      type: 'component',
      position: { x: f.x, y: f.y },
      selected: b.id === selectedId,
      data: { icon: d?.icon ?? '🧩', label: d?.label ?? b.componentType, title: b.title },
    };
  });
}

/** The distinct data-source types a block is bound to (from its slot bindings). */
function blockSourceTypes(b: DashboardBlock): string[] {
  const types = new Set<string>();
  for (const slot of Object.values(b.slots)) {
    for (const value of slot.values ?? []) {
      const ref = value.binding?.ref;
      const parsed = ref ? parseFieldRef(ref) : null;
      if (parsed) types.add(parsed.sourceType);
    }
  }
  return [...types];
}

/**
 * Derive data-source nodes and their edges into the blocks that bind them.
 * A source node sits left of the blocks that consume it; the edge shows the
 * live data flow (source → component).
 */
function deriveDataFlow(
  blocks: readonly DashboardBlock[],
  nodePos: Map<string, { x: number; y: number }>,
): { sourceNodes: Node[]; sourceEdges: Edge[] } {
  const consumers = new Map<string, string[]>(); // sourceType -> blockIds
  for (const b of blocks) {
    for (const st of blockSourceTypes(b)) {
      const list = consumers.get(st) ?? [];
      list.push(b.id);
      consumers.set(st, list);
    }
  }
  const sourceNodes: Node[] = [];
  const sourceEdges: Edge[] = [];
  let i = 0;
  for (const [sourceType, blockIds] of consumers) {
    // No colon in the id — React Flow uses it internally for handle lookup.
    const id = `dsrc-${sourceType}`;
    // Place the source to the left of the topmost consumer it feeds.
    const ys = blockIds.map((bid) => nodePos.get(bid)?.y ?? 80);
    const minY = Math.min(...ys);
    sourceNodes.push({
      id,
      type: 'source',
      position: { x: -240, y: minY + i * 20 },
      draggable: true,
      data: { sourceType },
    });
    for (const bid of blockIds) {
      sourceEdges.push({
        id: `flow-${sourceType}-${bid}`,
        source: id,
        target: bid,
        animated: true,
        style: { stroke: 'var(--color-accent-500)' },
      });
    }
    i += 1;
  }
  return { sourceNodes, sourceEdges };
}

/** A data-source node card (cyan accent — it's the data inlet). */
function SourceNode({ data }: NodeProps) {
  const d = data as { sourceType: string };
  return (
    <div className="min-w-[130px] rounded-lg border border-[var(--color-accent-500)]/60 bg-[var(--color-bg-elevated)] px-3 py-2 shadow-md">
      <div className="mb-0.5 flex items-center gap-1.5">
        <span className="text-sm leading-none">🗄️</span>
        <span className="rounded bg-[var(--color-accent-500)]/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-accent-500)]">
          Kaynak
        </span>
      </div>
      <div className="truncate text-[12px] font-medium text-[var(--color-text-primary)]">
        {d.sourceType}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !bg-[var(--color-accent-500)]"
      />
    </div>
  );
}

/** A component node card. */
function ComponentNode({ data, selected }: NodeProps) {
  const d = data as { icon: string; label: string; title: string };
  return (
    <div
      className={`min-w-[160px] rounded-lg border bg-[var(--color-bg-elevated)] px-3 py-2 shadow-md transition-colors ${
        selected ? 'border-brand-500' : 'border-[var(--color-border-secondary)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-brand-500" />
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-sm leading-none">{d.icon}</span>
        <span className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          {d.label}
        </span>
      </div>
      <div className="truncate text-[12px] font-medium text-[var(--color-text-primary)]">
        {d.title || '—'}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-brand-500" />
    </div>
  );
}

const nodeTypes = { component: ComponentNode, source: SourceNode };

/** The live component graph. */
function Graph({ focusBlockId }: { focusBlockId?: string }) {
  const blocks = useDashboardStore((s) => s.activeDashboard?.blocks ?? []);
  const selectedId = useDashboardStore((s) => s.selectedBlockId);
  const selectBlock = useDashboardStore((s) => s.selectBlock);
  const removeBlock = useDashboardStore((s) => s.removeBlock);
  const updateBlockFrame = useDashboardStore((s) => s.updateBlockFrame);
  const addBlockWithFrame = useDashboardStore((s) => s.addBlockWithFrame);
  const setBlueprintEdges = useDashboardStore((s) => s.setBlueprintEdges);
  const savedEdges = useDashboardStore(
    (s) =>
      (s.activeDashboard?.layout as { blueprintEdges?: PersistedEdge[] } | undefined)
        ?.blueprintEdges,
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(blocksToNodes(blocks, selectedId));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges(savedEdges));
  const dragging = useRef(false);

  // Blocks → nodes + derived data-source nodes, set into state so React Flow
  // owns stable node objects (needed for edge handle measurement).
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuild on block/selection content
  useEffect(() => {
    if (dragging.current) return;
    const compNodes = blocksToNodes(blocks, selectedId);
    const pos = new Map(compNodes.map((n) => [n.id, n.position]));
    const { sourceNodes } = deriveDataFlow(blocks, pos);
    setNodes([...compNodes, ...sourceNodes]);
  }, [blocks, selectedId, setNodes]);

  // Saved (user) edges + derived data-flow edges → set into edge state.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuild on blocks/edges content
  useEffect(() => {
    const compNodes = blocksToNodes(blocks, selectedId);
    const pos = new Map(compNodes.map((n) => [n.id, n.position]));
    const { sourceEdges } = deriveDataFlow(blocks, pos);
    setEdges([...toFlowEdges(savedEdges), ...sourceEdges]);
  }, [savedEdges, blocks, setEdges]);

  const persist = (next: Edge[]) =>
    setBlueprintEdges(
      next
        .filter((e) => !e.id.startsWith('flow-'))
        .map((e) => ({ id: e.id, source: e.source, target: e.target })),
    );

  const allNodes = nodes;
  const allEdges = edges;

  // Refit when the node count changes (e.g. a data-source node appears), so
  // newly derived nodes/edges come into view.
  const { fitView } = useReactFlow();
  const countRef = useRef(0);
  useEffect(() => {
    if (allNodes.length !== countRef.current) {
      countRef.current = allNodes.length;
      const t = setTimeout(() => fitView({ padding: 0.4, duration: 200 }), 60);
      return () => clearTimeout(t);
    }
  }, [allNodes.length, fitView]);

  const addComponent = (type: string) => {
    const n = blocks.length;
    addBlockWithFrame(type, { x: 120 + (n % 6) * 48, y: 120 + (n % 6) * 40 });
  };

  return (
    <ReactFlow
      nodes={allNodes}
      edges={allEdges}
      nodeTypes={nodeTypes}
      onNodesChange={(changes) => {
        // Ignore changes to derived source nodes; only real blocks mutate.
        const real = changes.filter((c) => !('id' in c) || !c.id.startsWith('dsrc-'));
        onNodesChange(real);
        for (const ch of real) if (ch.type === 'remove') removeBlock(ch.id);
      }}
      onEdgesChange={(changes) => {
        // Derived flow edges (flow:*) are read-only; only user edges persist.
        const real = changes.filter((c) => !('id' in c) || !c.id.startsWith('flow-'));
        onEdgesChange(real);
        const removed = real.filter((c) => c.type === 'remove').map((c) => c.id);
        if (removed.length) persist(edges.filter((e) => !removed.includes(e.id)));
      }}
      onConnect={(c: Connection) => {
        const next = addEdge({ ...c, animated: true }, edges);
        setEdges(next);
        persist(next);
      }}
      onNodeClick={(_, n) => {
        if (!n.id.startsWith('dsrc-')) selectBlock(n.id);
      }}
      onNodeDragStart={() => {
        dragging.current = true;
      }}
      onNodeDragStop={(_, n) => {
        dragging.current = false;
        const b = blocks.find((bb) => bb.id === n.id);
        if (b) {
          const f = frameXY(b);
          updateBlockFrame(b.id, {
            x: Math.round(n.position.x),
            y: Math.round(n.position.y),
            w: f.w,
            h: f.h,
          });
        }
      }}
      fitView
      fitViewOptions={{ padding: 0.5, minZoom: 0.2, maxZoom: 1 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="eventium-flow"
      style={{ background: 'var(--color-bg-sunken)' }}
    >
      <Panel position="top-left">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]/95 px-2 py-1 shadow-md backdrop-blur">
          <span className="pl-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Bileşen ekle
          </span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addComponent(e.target.value);
              e.target.value = '';
            }}
            className="rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-1.5 py-1 text-[11px] text-[var(--color-text-primary)] outline-none"
          >
            <option value="">+ Seç…</option>
            {listComponentDescriptors().map((d) => (
              <option key={d.type} value={d.type}>
                {d.label}
              </option>
            ))}
          </select>
          {focusBlockId && (
            <span className="pr-1 text-[10px] text-[var(--color-text-tertiary)]">
              {blocks.length} düğüm
            </span>
          )}
        </div>
      </Panel>
      <Background
        variant={BackgroundVariant.Dots}
        gap={26}
        size={1.6}
        color="var(--color-border-secondary)"
      />
      <Controls
        showInteractive={false}
        className="!bg-[var(--color-bg-elevated)] !border !border-[var(--color-border-primary)] !shadow-lg !rounded-lg overflow-hidden"
      />
      <MiniMap
        pannable
        zoomable
        maskColor="rgba(7, 10, 17, 0.6)"
        nodeColor="var(--color-brand-500)"
        nodeStrokeColor="var(--color-border-strong)"
        className="!bg-[var(--color-bg-secondary)] !border !border-[var(--color-border-primary)] !rounded-lg overflow-hidden"
      />
    </ReactFlow>
  );
}

/** A persisted edge shape stored in the page layout. */
interface PersistedEdge {
  id: string;
  source: string;
  target: string;
}

function toFlowEdges(saved: PersistedEdge[] | undefined): Edge[] {
  return (saved ?? []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
  }));
}

/** Reusable blueprint surface (used by the dock document and the modal). */
export function BlueprintCanvas({
  graphKey,
  onClose: _onClose,
}: {
  graphKey?: string;
  onClose?: () => void;
}) {
  return (
    <ReactFlowProvider>
      <Graph focusBlockId={graphKey} />
    </ReactFlowProvider>
  );
}

/** The Blueprint modal (default export for lazy loading via ⌘K). */
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
        <div className="flex h-header shrink-0 items-center justify-between border-b border-[var(--color-border-primary)] px-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Blueprint</h2>
            <p className="text-[11px] text-[var(--color-text-tertiary)]">
              Sayfanın canlı bileşen grafiği — her düğüm bir bileşen; ekle, taşı, bağla.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
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
        <div className="min-h-0 flex-1">
          <BlueprintCanvas onClose={onClose} />
        </div>
      </motion.div>
    </div>
  );
}
