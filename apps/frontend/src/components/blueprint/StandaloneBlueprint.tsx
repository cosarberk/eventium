/**
 * @fileoverview Standalone blueprint (`.eb` file) — an independent logic graph.
 *
 * Unlike the page's live component graph, an `.eb` file is its own canvas: the
 * user adds step nodes and wires them, and the graph (nodes + edges) is saved
 * into the file node's `data`. Each `.eb` keeps its own graph.
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { fetchNodes, updateNodeData } from '@/services/node.service';
import { useDashboardStore } from '@/storage/dashboard.store';

interface StepData extends Record<string, unknown> {
  label: string;
  kind: 'baslangic' | 'islem' | 'kosul' | 'cikis';
}

const KIND_META: Record<StepData['kind'], { label: string; accent: string }> = {
  baslangic: { label: 'Başlangıç', accent: 'var(--color-severity-low)' },
  islem: { label: 'İşlem', accent: 'var(--color-brand-500)' },
  kosul: { label: 'Koşul', accent: 'var(--color-severity-medium)' },
  cikis: { label: 'Çıkış', accent: 'var(--color-accent-500)' },
};

/** A step node card. */
function StepNode({ data, selected }: NodeProps) {
  const d = data as StepData;
  const meta = KIND_META[d.kind] ?? KIND_META.islem;
  return (
    <div
      className={`min-w-[150px] rounded-lg border bg-[var(--color-bg-elevated)] px-3 py-2 shadow-md ${
        selected ? 'border-brand-500' : 'border-[var(--color-border-secondary)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-brand-500" />
      <span
        className="mb-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
        style={{ backgroundColor: meta.accent }}
      >
        {meta.label}
      </span>
      <div className="truncate text-[12px] font-medium text-[var(--color-text-primary)]">
        {d.label || '—'}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-brand-500" />
    </div>
  );
}

const nodeTypes = { step: StepNode };

let idSeq = 0;
const nextId = () => `n${Date.now().toString(36)}${(idSeq++).toString(36)}`;

/** The standalone editor for one `.eb` node. */
function Editor({ nodeId }: { nodeId: string }) {
  const projectId = useDashboardStore((s) => s.activeProject?.id);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load the saved graph from the node's data (once).
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!projectId) return;
      try {
        const all = await fetchNodes(projectId);
        const graph = all.find((n) => n.id === nodeId)?.data?.graph as
          | { nodes: Node[]; edges: Edge[] }
          | undefined;
        if (alive && graph) {
          setNodes(graph.nodes ?? []);
          setEdges(graph.edges ?? []);
        }
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId, nodeId, setNodes, setEdges]);

  // Persist (debounced) whenever the graph changes after initial load.
  useEffect(() => {
    if (!loaded) return;
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      updateNodeData(nodeId, {
        graph: {
          nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
          edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
        },
      })
        .then(() => setSaved(true))
        .catch((e: unknown) => toast.error(`Kaydedilemedi: ${(e as Error).message}`));
    }, 700);
  }, [nodes, edges, loaded, nodeId]);

  const addStep = (kind: StepData['kind']) => {
    const id = nextId();
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: 'step',
        position: { x: 80 + (ns.length % 5) * 60, y: 80 + (ns.length % 5) * 50 },
        data: { label: KIND_META[kind].label, kind },
      },
    ]);
  };

  const selected = nodes.find((n) => n.id === selectedId);

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border-primary)] px-3 py-1.5 text-[11px] text-[var(--color-text-tertiary)]">
        <span>Blueprint · .eb — bağımsız mantık grafiği</span>
        <span className={saved ? 'text-emerald-400/70' : 'text-amber-400'}>
          {saved ? 'Kaydedildi' : 'Kaydediliyor…'}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(c: Connection) => setEdges((es) => addEdge({ ...c, animated: true }, es))}
          onNodeClick={(_, n) => setSelectedId(n.id)}
          onPaneClick={() => setSelectedId(null)}
          fitView
          fitViewOptions={{ padding: 0.5, minZoom: 0.2, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 } }}
          proOptions={{ hideAttribution: true }}
          className="eventium-flow"
          style={{ background: 'var(--color-bg-sunken)' }}
        >
          <Panel position="top-left">
            <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]/95 px-1.5 py-1 shadow-md backdrop-blur">
              {(Object.keys(KIND_META) as StepData['kind'][]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => addStep(k)}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                >
                  + {KIND_META[k].label}
                </button>
              ))}
            </div>
          </Panel>
          {selected && (
            <Panel position="top-right">
              <div className="w-56 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] p-2.5 shadow-lg">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  Düğüm
                </p>
                <input
                  value={(selected.data as StepData).label}
                  onChange={(e) =>
                    setNodes((ns) =>
                      ns.map((n) =>
                        n.id === selected.id
                          ? { ...n, data: { ...n.data, label: e.target.value } }
                          : n,
                      ),
                    )
                  }
                  className="mb-2 w-full rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    setNodes((ns) => ns.filter((n) => n.id !== selected.id));
                    setEdges((es) =>
                      es.filter((e) => e.source !== selected.id && e.target !== selected.id),
                    );
                    setSelectedId(null);
                  }}
                  className="w-full rounded-md px-2 py-1 text-[11px] text-red-400 hover:bg-[var(--color-surface-hover)]"
                >
                  Düğümü sil
                </button>
              </div>
            </Panel>
          )}
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
            className="!bg-[var(--color-bg-secondary)] !border !border-[var(--color-border-primary)] !rounded-lg overflow-hidden"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

/** Standalone blueprint document for one `.eb` file node. */
export function StandaloneBlueprint({ nodeId }: { nodeId: string }) {
  return (
    <ReactFlowProvider>
      <Editor nodeId={nodeId} />
    </ReactFlowProvider>
  );
}
