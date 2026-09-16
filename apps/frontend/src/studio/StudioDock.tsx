/**
 * @fileoverview Studio docking manager — a real window manager (AvalonDock /
 * Visual Studio style) built on dockview.
 *
 * Everything is a dockable document/tool: **Araç Kutusu** (toolbox), **Tasarımcı**
 * (designer), a control's **Kod** and **Blueprint**, and **Özellikler**
 * (properties). Panels can be dragged, docked to any edge, split into tab groups,
 * floated, and resized; the layout persists per browser. This is not a fixed page
 * — it is a rearrangeable workspace.
 */
import {
  type DockviewApi,
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  themeVisualStudio,
} from 'dockview-react';
import 'dockview-react/dist/styles/dockview.css';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BlockInspector } from '@/components/design/BlockInspector';
import { useDashboard } from '@/hooks/useDashboard';
import { useNodes } from '@/hooks/useNodes';
import { fetchProjects } from '@/services/project.service';
import { useDashboardStore } from '@/storage/dashboard.store';
import { CanvasSurface } from './CanvasSurface';
import { CodeEditor } from './CodeEditor';
import { ConsolePanel } from './ConsolePanel';
import { DataSourcesPanel } from './DataSourcesPanel';
import { StudioTab } from './DockTabs';
import { ExplorerPanel } from './ExplorerPanel';
import { FileDocument } from './FileDocument';
import { getFileType } from './file-types';
import { NewFileDialog } from './NewFileDialog';
import { OutlinePanel } from './OutlinePanel';
import { PageSourcePanel } from './PageSourcePanel';
import { Palette } from './Palette';
import { ProblemsPanel } from './ProblemsPanel';

const BlueprintCanvas = lazy(() =>
  import('@/components/blueprint/BlueprintGraph').then((m) => ({ default: m.BlueprintCanvas })),
);
const StandaloneBlueprint = lazy(() =>
  import('@/components/blueprint/StandaloneBlueprint').then((m) => ({
    default: m.StandaloneBlueprint,
  })),
);

const LAYOUT_KEY = 'eventium-dock-layout-v7';

/**
 * Builds the default tool-window layout (used on first load and on reset).
 *
 * VS Code-style: a narrow left column (Toolbox over Outline), the Designer/
 * Preview document well in the wide center with Problems/Console docked beneath
 * it, and an Inspector/Data column on the right.
 */
function applyDefaultLayout(api: DockviewApi) {
  api.addPanel({ id: 'designer', component: 'designer', title: 'Tasarımcı' });
  api.addPanel({
    id: 'preview',
    component: 'preview',
    title: 'Önizleme',
    position: { referencePanel: 'designer', direction: 'within' },
  });
  api.addPanel({
    id: 'explorer',
    component: 'explorer',
    title: 'Proje',
    position: { referencePanel: 'designer', direction: 'left' },
  });
  api.addPanel({
    id: 'toolbox',
    component: 'toolbox',
    title: 'Araç Kutusu',
    position: { referencePanel: 'explorer', direction: 'within' },
  });
  api.addPanel({
    id: 'outline',
    component: 'outline',
    title: 'Anahat',
    position: { referencePanel: 'explorer', direction: 'below' },
  });
  api.addPanel({
    id: 'properties',
    component: 'properties',
    title: 'Özellikler',
    position: { referencePanel: 'designer', direction: 'right' },
  });
  api.addPanel({
    id: 'data',
    component: 'data',
    title: 'Veri & Kaynaklar',
    position: { referencePanel: 'properties', direction: 'within' },
  });
  api.addPanel({
    id: 'problems',
    component: 'problems',
    title: 'Sorunlar',
    position: { referencePanel: 'designer', direction: 'below' },
  });
  api.addPanel({
    id: 'console',
    component: 'console',
    title: 'Konsol',
    position: { referencePanel: 'problems', direction: 'within' },
  });

  // Proportions: narrow side columns, a short bottom dock, a dominant center.
  api.getPanel('explorer')?.group.api.setSize({ width: 250 });
  api.getPanel('properties')?.group.api.setSize({ width: 320 });
  api.getPanel('problems')?.group.api.setSize({ height: 200 });
  api.getPanel('outline')?.group.api.setSize({ height: 240 });

  // Front-most tabs.
  api.getPanel('data')?.api.setActive();
  api.getPanel('properties')?.api.setActive();
  api.getPanel('console')?.api.setActive();
  api.getPanel('problems')?.api.setActive();
  api.getPanel('preview')?.api.setActive();
  api.getPanel('toolbox')?.api.setActive();
  api.getPanel('explorer')?.api.setActive();
  api.getPanel('designer')?.api.setActive();
}

/** Veri perspektifi — kaynaklar öne çıkar. */
function applyDataLayout(api: DockviewApi) {
  api.addPanel({ id: 'designer', component: 'designer', title: 'Tasarımcı' });
  api.addPanel({
    id: 'data',
    component: 'data',
    title: 'Veri & Kaynaklar',
    position: { referencePanel: 'designer', direction: 'left' },
  });
  api.addPanel({
    id: 'toolbox',
    component: 'toolbox',
    title: 'Araç Kutusu',
    position: { referencePanel: 'data', direction: 'below' },
  });
  api.addPanel({
    id: 'properties',
    component: 'properties',
    title: 'Özellikler',
    position: { referencePanel: 'designer', direction: 'right' },
  });
  api.addPanel({
    id: 'console',
    component: 'console',
    title: 'Konsol',
    position: { referencePanel: 'designer', direction: 'below' },
  });
  api.addPanel({
    id: 'problems',
    component: 'problems',
    title: 'Sorunlar',
    position: { referencePanel: 'console', direction: 'within' },
  });
  // Data-first proportions: a prominent sources column, a short output dock.
  api.getPanel('data')?.group.api.setSize({ width: 300 });
  api.getPanel('properties')?.group.api.setSize({ width: 300 });
  api.getPanel('console')?.group.api.setSize({ height: 180 });
  api.getPanel('data')?.api.setActive();
  api.getPanel('properties')?.api.setActive();
  api.getPanel('console')?.api.setActive();
  api.getPanel('designer')?.api.setActive();
}

/** Mantık perspektifi — anahat + sorunlar/konsol öne çıkar. */
function applyLogicLayout(api: DockviewApi) {
  api.addPanel({ id: 'designer', component: 'designer', title: 'Tasarımcı' });
  api.addPanel({
    id: 'outline',
    component: 'outline',
    title: 'Anahat',
    position: { referencePanel: 'designer', direction: 'left' },
  });
  api.addPanel({
    id: 'toolbox',
    component: 'toolbox',
    title: 'Araç Kutusu',
    position: { referencePanel: 'outline', direction: 'below' },
  });
  api.addPanel({
    id: 'properties',
    component: 'properties',
    title: 'Özellikler',
    position: { referencePanel: 'designer', direction: 'right' },
  });
  api.addPanel({
    id: 'problems',
    component: 'problems',
    title: 'Sorunlar',
    position: { referencePanel: 'designer', direction: 'below' },
  });
  api.addPanel({
    id: 'console',
    component: 'console',
    title: 'Konsol',
    position: { referencePanel: 'problems', direction: 'within' },
  });
  // Logic-first proportions: a taller Problems/Console dock for debugging.
  api.getPanel('outline')?.group.api.setSize({ width: 260 });
  api.getPanel('properties')?.group.api.setSize({ width: 300 });
  api.getPanel('problems')?.group.api.setSize({ height: 260 });
  api.getPanel('problems')?.api.setActive();
  api.getPanel('designer')?.api.setActive();
}

/** Önizleme perspektifi — sadece canlı önizleme. */
function applyPreviewLayout(api: DockviewApi) {
  api.addPanel({ id: 'preview', component: 'preview', title: 'Önizleme' });
  api.addPanel({
    id: 'outline',
    component: 'outline',
    title: 'Anahat',
    position: { referencePanel: 'preview', direction: 'left' },
  });
  // Preview-first: a dominant live preview, a slim outline to navigate.
  api.getPanel('outline')?.group.api.setSize({ width: 220 });
  api.getPanel('preview')?.api.setActive();
}

/** A saved docking arrangement the user can switch between (Blender workspaces). */
const PERSPECTIVES: {
  id: string;
  label: string;
  icon: React.ReactNode;
  apply: (api: DockviewApi) => void;
}[] = [
  {
    id: 'design',
    label: 'Tasarım',
    icon: <Glyph d="M3 3h6v6H3V3zM11 3h2v2h-2V3zM11 7h2v6h-2V7zM3 11h6v2H3v-2z" />,
    apply: applyDefaultLayout,
  },
  {
    id: 'data',
    label: 'Veri',
    icon: (
      <Glyph d="M8 2c2.8 0 5 .9 5 2s-2.2 2-5 2-5-.9-5-2 2.2-2 5-2zM3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" />
    ),
    apply: applyDataLayout,
  },
  {
    id: 'logic',
    label: 'Mantık',
    icon: <Glyph d="M4 3h3v3H4V3zM9 10h3v3H9v-3zM5.5 6v2.5a1 1 0 001 1H9" />,
    apply: applyLogicLayout,
  },
  {
    id: 'preview',
    label: 'Önizleme',
    icon: <Glyph d="M5 3.5l7 4.5-7 4.5v-9z" />,
    apply: applyPreviewLayout,
  },
];

/** A tiny 14px stroked glyph for a tool window. */
function Glyph({ d }: { d: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A tool window's identity for the View toolbar. */
const TOOL_WINDOWS: {
  id: string;
  component: string;
  title: string;
  icon: React.ReactNode;
  dir: 'left' | 'right' | 'below' | 'within';
}[] = [
  {
    id: 'explorer',
    component: 'explorer',
    title: 'Proje',
    icon: <Glyph d="M2 4a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1V12a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" />,
    dir: 'left',
  },
  {
    id: 'toolbox',
    component: 'toolbox',
    title: 'Araç Kutusu',
    icon: <Glyph d="M2 5.5h12M2 5.5v7a1 1 0 001 1h10a1 1 0 001-1v-7M6 5.5V4a2 2 0 014 0v1.5" />,
    dir: 'left',
  },
  {
    id: 'outline',
    component: 'outline',
    title: 'Anahat',
    icon: <Glyph d="M3 4h10M5 8h8M5 12h8M3 8v.01M3 12v.01" />,
    dir: 'left',
  },
  {
    id: 'preview',
    component: 'preview',
    title: 'Önizleme',
    icon: <Glyph d="M5 3.5l7 4.5-7 4.5v-9z" />,
    dir: 'within',
  },
  {
    id: 'source',
    component: 'source',
    title: 'Proje Kaynağı',
    icon: <Glyph d="M6 4L2.5 8 6 12M10 4l3.5 4L10 12" />,
    dir: 'within',
  },
  {
    id: 'properties',
    component: 'properties',
    title: 'Özellikler',
    icon: (
      <Glyph d="M8 10.2A2.2 2.2 0 108 5.8a2.2 2.2 0 000 4.4zM8 2v1.6M8 12.4V14M14 8h-1.6M3.6 8H2M12.2 3.8l-1.1 1.1M4.9 11.1l-1.1 1.1M12.2 12.2l-1.1-1.1M4.9 4.9L3.8 3.8" />
    ),
    dir: 'right',
  },
  {
    id: 'data',
    component: 'data',
    title: 'Veri',
    icon: (
      <Glyph d="M8 2c2.8 0 5 .9 5 2s-2.2 2-5 2-5-.9-5-2 2.2-2 5-2zM3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" />
    ),
    dir: 'right',
  },
  {
    id: 'problems',
    component: 'problems',
    title: 'Sorunlar',
    icon: <Glyph d="M8 2.5l6 10.5H2L8 2.5zM8 6.5v3M8 11.4v.01" />,
    dir: 'below',
  },
  {
    id: 'console',
    component: 'console',
    title: 'Konsol',
    icon: (
      <Glyph d="M2.5 3h11a1 1 0 011 1v8a1 1 0 01-1 1h-11a1 1 0 01-1-1V4a1 1 0 011-1zM4.5 6.5L6.5 8l-2 1.5M8 9.5h3.5" />
    ),
    dir: 'below',
  },
];

/** Reopen a tool window if closed, otherwise focus it. */
function ensureToolWindow(api: DockviewApi, w: (typeof TOOL_WINDOWS)[number]) {
  const existing = api.getPanel(w.id);
  if (existing) {
    existing.api.setActive();
    return;
  }
  api.addPanel({
    id: w.id,
    component: w.component,
    title: w.title,
    position: { referencePanel: 'designer', direction: w.dir },
  });
}

/** Open (or focus) a control's code/blueprint document. */
function openDoc(
  api: DockviewApi,
  kind: 'code' | 'blueprint',
  blockId: string,
  title: string,
  split: boolean,
) {
  const id = `${kind}:${blockId}`;
  const existing = api.getPanel(id);
  if (existing) {
    existing.api.setActive();
    return;
  }
  api.addPanel({
    id,
    component: kind,
    title,
    params: { blockId },
    position: { referencePanel: 'designer', direction: split ? 'right' : 'within' },
  });
}

/** Toolbox document — the component palette. */
function ToolboxPanel() {
  return (
    <div className="h-full overflow-hidden bg-[var(--color-bg-secondary)]">
      <Palette />
    </div>
  );
}

/** Outline / layers document. */
function OutlineDoc() {
  return <OutlinePanel />;
}

/** Data & Sources document. */
function DataDoc() {
  return <DataSourcesPanel />;
}

/** Problems document. */
function ProblemsDoc() {
  return <ProblemsPanel />;
}

/** Console document. */
function ConsoleDoc() {
  return <ConsolePanel />;
}

/** Preview document — the page rendered read-only, interactions live. */
function PreviewDoc() {
  return <CanvasSurface editing={false} />;
}

/** Designer document — the canvas. */
function DesignerPanel(props: IDockviewPanelProps) {
  const blocks = useDashboardStore((s) => s.activeDashboard?.blocks);
  const titleFor = (id: string) => blocks?.find((b) => b.id === id)?.title || 'Bileşen';
  return (
    <CanvasSurface
      editing
      onOpenCode={(id) => openDoc(props.containerApi, 'code', id, `${titleFor(id)} · Kod`, false)}
    />
  );
}

/** Code-behind document for a control. */
function CodePanel(props: IDockviewPanelProps<{ blockId: string }>) {
  const blockId = props.params.blockId;
  const block = useDashboardStore((s) => s.activeDashboard?.blocks.find((b) => b.id === blockId));
  if (!block) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-tertiary)]">
        Bileşen bulunamadı
      </div>
    );
  }
  return (
    <CodeEditor
      block={block}
      onOpenBlueprint={(split) =>
        openDoc(
          props.containerApi,
          'blueprint',
          blockId,
          `${block.title || 'Bileşen'} · Blueprint`,
          split,
        )
      }
    />
  );
}

/** A project file document (script/data/variables/theme/component). */
function FilePanel(props: IDockviewPanelProps<{ nodeId: string; kind: string }>) {
  return <FileDocument nodeId={props.params.nodeId} kind={props.params.kind} />;
}

/** A standalone `.eb` blueprint document (its own saved logic graph). */
function EbFilePanel(props: IDockviewPanelProps<{ nodeId: string }>) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-tertiary)]">
          Blueprint yükleniyor…
        </div>
      }
    >
      <StandaloneBlueprint nodeId={props.params.nodeId} />
    </Suspense>
  );
}

/** Open (or focus) a project file in its own document. */
function openFileDoc(api: DockviewApi, node: { id: string; kind: string; name: string }) {
  const id = `file:${node.id}`;
  const existing = api.getPanel(id);
  if (existing) {
    existing.api.setActive();
    return;
  }
  const type = getFileType(node.kind);
  const title = type ? `${node.name}.${type.extension}` : node.name;
  // A .eb file opens its own standalone logic graph; everything else opens the
  // generic file editor.
  const component = node.kind === 'blueprint' ? 'ebfile' : 'file';
  api.addPanel({
    id,
    component,
    title,
    params: { nodeId: node.id, kind: node.kind },
    position: { referencePanel: 'designer', direction: 'within' },
  });
}

/** Blueprint document (inline React Flow, lazy) — one graph per block. */
function BlueprintPanel(props: IDockviewPanelProps<{ blockId: string }>) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-tertiary)]">
          Blueprint yükleniyor…
        </div>
      }
    >
      <BlueprintCanvas graphKey={props.params.blockId} />
    </Suspense>
  );
}

/** Properties document — the block inspector. */
function PropertiesPanel() {
  const activeDashboard = useDashboardStore((s) => s.activeDashboard);
  const selectedId = useDashboardStore((s) => s.selectedBlockId);
  const selectBlock = useDashboardStore((s) => s.selectBlock);
  const updateBlockTitle = useDashboardStore((s) => s.updateBlockTitle);
  const updateBlockSlots = useDashboardStore((s) => s.updateBlockSlots);
  const updateBlockOptions = useDashboardStore((s) => s.updateBlockOptions);

  const block = activeDashboard?.blocks?.find((b) => b.id === selectedId) ?? null;

  if (!block) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-[var(--color-text-tertiary)]">
        Özellikleri görmek için tuvalde bir bileşen seç.
      </div>
    );
  }
  return (
    <div className="h-full overflow-auto bg-[var(--color-bg-secondary)]">
      <BlockInspector
        block={block}
        onTitleChange={(title) => updateBlockTitle(block.id, title)}
        onSlotsChange={(slots) => updateBlockSlots(block.id, slots)}
        onOptionsChange={(options) => updateBlockOptions(block.id, options)}
        onClose={() => selectBlock(null)}
      />
    </div>
  );
}

const COMPONENTS = {
  designer: DesignerPanel,
  preview: PreviewDoc,
  code: CodePanel,
  blueprint: BlueprintPanel,
  file: FilePanel,
  ebfile: EbFilePanel,
  source: PageSourcePanel,
  explorer: ExplorerPanel,
  toolbox: ToolboxPanel,
  outline: OutlineDoc,
  data: DataDoc,
  problems: ProblemsDoc,
  console: ConsoleDoc,
  properties: PropertiesPanel,
};

/** A compact square icon button for the document toolbar. */
function ToolbarIcon({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-35"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

/** The docking workspace. */
export function StudioDock() {
  const apiRef = useRef<DockviewApi | null>(null);
  const blocks = useDashboardStore((s) => s.activeDashboard?.blocks);
  const activeDashboard = useDashboardStore((s) => s.activeDashboard);
  const activeProject = useDashboardStore((s) => s.activeProject);
  const openPage = useDashboardStore((s) => s.openPage);
  const addPage = useDashboardStore((s) => s.addPage);
  const closeProject = useDashboardStore((s) => s.closeProject);
  const undo = useDashboardStore((s) => s.undo);
  const redo = useDashboardStore((s) => s.redo);
  const canUndo = useDashboardStore((s) => s.past.length > 0);
  const canRedo = useDashboardStore((s) => s.future.length > 0);
  const dirty = useDashboardStore((s) => s.dirty);
  const { saveLayout } = useDashboard();
  const { createNode } = useNodes(activeProject?.id);
  const [perspective, setPerspective] = useState<string>('design');

  const handleSave = () => {
    saveLayout();
    toast.success('Kaydedildi');
  };

  /**
   * Add a new blank page to the open project and focus it. Routes through the
   * node tree so the page also shows up in the Project Explorer as a `.ep` file.
   */
  const handleNewPage = async () => {
    if (!activeProject) return;
    try {
      const node = await createNode({
        projectId: activeProject.id,
        kind: 'page',
        name: `Sayfa ${activeProject.pages.length + 1}`,
      });
      const projects = await fetchProjects();
      const page = projects
        .find((p) => p.id === activeProject.id)
        ?.pages.find((p) => p.id === node.refId);
      if (page) addPage(page);
      toast.success('Sayfa eklendi');
    } catch (e) {
      toast.error(`Sayfa eklenemedi: ${(e as Error).message}`);
    }
  };

  /** Switch docking workspace (rebuilds the layout for that perspective). */
  const applyPerspective = (id: string) => {
    const p = PERSPECTIVES.find((x) => x.id === id);
    const api = apiRef.current;
    if (!p || !api) return;
    api.clear();
    p.apply(api);
    setPerspective(id);
    try {
      localStorage.setItem('eventium-perspective', id);
    } catch {
      // ignore
    }
  };

  const onReady = (event: DockviewReadyEvent) => {
    const api = event.api;
    apiRef.current = api;

    let restored = false;
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved) {
        api.fromJSON(JSON.parse(saved));
        restored = Boolean(api.getPanel('designer'));
      }
    } catch {
      restored = false;
    }

    if (!restored) applyDefaultLayout(api);

    try {
      const savedPerspective = localStorage.getItem('eventium-perspective');
      if (savedPerspective) setPerspective(savedPerspective);
    } catch {
      // ignore
    }

    api.onDidLayoutChange(() => {
      try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(api.toJSON()));
      } catch {
        // ignore storage failures
      }
    });
  };

  // Close code/blueprint documents whose block was deleted.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const ids = new Set((blocks ?? []).map((b) => b.id));
    for (const panel of api.panels) {
      const [kind, bid] = panel.id.split(':');
      if ((kind === 'code' || kind === 'blueprint') && bid && !ids.has(bid)) {
        panel.api.close();
      }
    }
  }, [blocks]);

  const resetLayout = () => {
    const api = apiRef.current;
    if (!api) return;
    api.clear();
    applyDefaultLayout(api);
    try {
      localStorage.removeItem(LAYOUT_KEY);
    } catch {
      // ignore
    }
  };

  // Menu-bar commands + ⌘S reach the dock through window events.
  useEffect(() => {
    const onSave = () => handleSave();
    const onReset = () => resetLayout();
    const onOpenPanel = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const w = TOOL_WINDOWS.find((t) => t.id === id);
      if (w && apiRef.current) ensureToolWindow(apiRef.current, w);
    };
    const onOpenFile = (e: Event) => {
      const node = (e as CustomEvent<{ id: string; kind: string; name: string }>).detail;
      if (node && apiRef.current) openFileDoc(apiRef.current, node);
    };
    const onPerspective = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) applyPerspective(id);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('eventium:save', onSave);
    window.addEventListener('eventium:reset-layout', onReset);
    window.addEventListener('eventium:open-panel', onOpenPanel as EventListener);
    window.addEventListener('eventium:open-file', onOpenFile as EventListener);
    window.addEventListener('eventium:perspective', onPerspective as EventListener);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('eventium:save', onSave);
      window.removeEventListener('eventium:reset-layout', onReset);
      window.removeEventListener('eventium:open-panel', onOpenPanel as EventListener);
      window.removeEventListener('eventium:open-file', onOpenFile as EventListener);
      window.removeEventListener('eventium:perspective', onPerspective as EventListener);
      window.removeEventListener('keydown', onKey);
    };
  });

  return (
    <div className="flex h-full w-full flex-col">
      {/* Document toolbar — project context, edit actions, tool windows */}
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-2">
        {/* Left: back to start + project switcher */}
        <button
          type="button"
          onClick={closeProject}
          title="Başlangıç ekranına dön"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M8.5 3L4.5 7l4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Başlangıç
        </button>
        <span className="mx-1 h-4 w-px bg-[var(--color-border-primary)]" />
        {/* Project name */}
        <span className="max-w-[220px] truncate px-1 text-[12px] font-semibold text-[var(--color-text-primary)]">
          {activeProject?.name ?? activeDashboard?.name ?? 'Proje'}
        </span>

        {/* Page switcher — only shown once the project has more than one page */}
        {activeProject && activeProject.pages.length > 1 && (
          <>
            <span className="mx-0.5 text-[var(--color-text-tertiary)]">/</span>
            <select
              value={activeDashboard?.id ?? ''}
              onChange={(e) => {
                const p = activeProject.pages.find((pg) => pg.id === e.target.value);
                if (p) openPage(p);
              }}
              title="Sayfa değiştir"
              className="max-w-[180px] cursor-pointer appearance-none rounded-md bg-transparent px-1 py-1 pr-5 text-[11px] font-medium text-[var(--color-text-secondary)] outline-none hover:bg-[var(--color-surface-hover)]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right center',
              }}
            >
              {activeProject.pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </>
        )}
        <ToolbarIcon title="Yeni sayfa" onClick={handleNewPage}>
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </ToolbarIcon>

        {/* Perspectives — Blender-style workspaces */}
        <div className="ml-2 flex items-center gap-0.5 rounded-lg bg-[var(--color-bg-tertiary)] p-0.5">
          {PERSPECTIVES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPerspective(p.id)}
              title={`${p.label} çalışma alanı`}
              className={`flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors ${
                perspective === p.id
                  ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {p.icon}
              <span className="hidden xl:inline">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Edit actions */}
        <span className="mx-1 h-4 w-px bg-[var(--color-border-primary)]" />
        <ToolbarIcon title="Geri al (⌘Z)" onClick={undo} disabled={!canUndo}>
          <path
            d="M6 4L3 7l3 3M3 7h7a3 3 0 010 6H8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </ToolbarIcon>
        <ToolbarIcon title="Yinele (⌘⇧Z)" onClick={redo} disabled={!canRedo}>
          <path
            d="M10 4l3 3-3 3M13 7H6a3 3 0 000 6h2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </ToolbarIcon>
        <button
          type="button"
          onClick={handleSave}
          title="Kaydet (⌘S)"
          className="ml-0.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 2h6l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z M5 2v3h4M4.5 9.5h5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Kaydet
          {dirty && <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />}
        </button>

        {/* Right: tool windows + reset */}
        <div className="flex-1" />
        <span className="pl-1 pr-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Pencereler
        </span>
        {TOOL_WINDOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            title={`${w.title} — aç/odakla`}
            aria-label={w.title}
            onClick={() => apiRef.current && ensureToolWindow(apiRef.current, w)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-primary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            {w.icon}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-[var(--color-border-primary)]" />
        <ToolbarIcon title="Pencere yerleşimini sıfırla" onClick={resetLayout}>
          <path
            d="M3 7a4 4 0 104-4M3 7V4M3 7h3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </ToolbarIcon>
      </div>
      <div className="eventium-dock min-h-0 flex-1">
        <DockviewReact
          components={COMPONENTS}
          defaultTabComponent={StudioTab}
          onReady={onReady}
          theme={themeVisualStudio}
          className="h-full w-full"
        />
      </div>
      <NewFileDialog />
    </div>
  );
}
