/**
 * @fileoverview Blueprint / node-flow editor (Faz 4).
 *
 * A visual graph (React Flow) where the user wires the platform together:
 * data-source nodes → transform nodes → panel/output nodes, connected by edges.
 * This is the "neyin neye bağlanacağını görsel kur" layer. v1 delivers the full
 * editing surface — add nodes, connect, move, minimap/controls; execution
 * semantics land on top of this graph next.
 *
 * Opened as an overlay tool via the `eventium:blueprint` window event (⌘K).
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
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ── Custom node cards ────────────────────────────────────── */
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

const INITIAL_NODES: Node[] = [
  {
    id: 'n1',
    type: 'source',
    position: { x: 40, y: 120 },
    data: { title: 'GitLab', subtitle: 'merge_request' },
  },
  {
    id: 'n2',
    type: 'transform',
    position: { x: 320, y: 120 },
    data: { title: 'Filtre', subtitle: 'state = merged' },
  },
  {
    id: 'n3',
    type: 'panel',
    position: { x: 600, y: 120 },
    data: { title: 'Tablo', subtitle: 'Kaynak→hedef' },
  },
];
const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: 'n1', target: 'n2', animated: true },
  { id: 'e2', source: 'n2', target: 'n3', animated: true },
];

let idc = 100;
const nextId = () => `n${idc++}`;

/* ── Editor ──────────────────────────────────────────────── */
function Editor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)),
    [setEdges],
  );

  const addNode = (kind: 'source' | 'transform' | 'panel') => {
    const titles = { source: 'Kaynak', transform: 'Transform', panel: 'Panel' };
    setNodes((ns) => [
      ...ns,
      {
        id: nextId(),
        type: kind,
        position: { x: 120 + Math.random() * 240, y: 80 + Math.random() * 200 },
        data: { title: titles[kind] },
      },
    ]);
  };

  return (
    <div className="relative h-full w-full">
      {/* Palette */}
      <div className="absolute left-3 top-3 z-10 flex gap-1.5 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]/90 p-1 backdrop-blur">
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
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
  );
}

/** Overlay host — opens on the `eventium:blueprint` window event. */
export function BlueprintOverlay() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('eventium:blueprint', onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('eventium:blueprint', onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={wrapRef}
          className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="relative flex h-[82vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] shadow-xl"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border-primary)] px-4 h-header shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Blueprint
                </h2>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  Kaynak → transform → panel: akışı görsel bağla.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
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
              <ReactFlowProvider>
                <Editor />
              </ReactFlowProvider>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
