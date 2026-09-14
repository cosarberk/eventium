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
import { lazy, Suspense, useEffect, useRef } from 'react';
import { BlockInspector } from '@/components/design/BlockInspector';
import { useDashboardStore } from '@/storage/dashboard.store';
import { CanvasSurface } from './CanvasSurface';
import { CodeEditor } from './CodeEditor';
import { ConsolePanel } from './ConsolePanel';
import { DataSourcesPanel } from './DataSourcesPanel';
import { OutlinePanel } from './OutlinePanel';
import { Palette } from './Palette';
import { ProblemsPanel } from './ProblemsPanel';

const BlueprintCanvas = lazy(() =>
  import('@/components/blueprint/BlueprintModal').then((m) => ({ default: m.BlueprintCanvas })),
);

const LAYOUT_KEY = 'eventium-dock-layout-v5';

/** Builds the default tool-window layout (used on first load and on reset). */
function applyDefaultLayout(api: DockviewApi) {
  api.addPanel({ id: 'designer', component: 'designer', title: 'Tasarımcı' });
  api.addPanel({
    id: 'toolbox',
    component: 'toolbox',
    title: 'Araç Kutusu',
    position: { referencePanel: 'designer', direction: 'left' },
  });
  api.addPanel({
    id: 'outline',
    component: 'outline',
    title: 'Anahat',
    position: { referencePanel: 'toolbox', direction: 'below' },
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
    id: 'preview',
    component: 'preview',
    title: 'Önizleme',
    position: { referencePanel: 'designer', direction: 'within' },
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
  api.getPanel('properties')?.api.setActive();
  api.getPanel('problems')?.api.setActive();
  api.getPanel('designer')?.api.setActive();
}

/** A tool window's identity for the View toolbar. */
const TOOL_WINDOWS: {
  id: string;
  component: string;
  title: string;
  glyph: string;
  dir: 'left' | 'right' | 'below' | 'within';
}[] = [
  { id: 'toolbox', component: 'toolbox', title: 'Araç Kutusu', glyph: '🧰', dir: 'left' },
  { id: 'outline', component: 'outline', title: 'Anahat', glyph: '☰', dir: 'left' },
  { id: 'preview', component: 'preview', title: 'Önizleme', glyph: '▶', dir: 'within' },
  { id: 'properties', component: 'properties', title: 'Özellikler', glyph: '⚙', dir: 'right' },
  { id: 'data', component: 'data', title: 'Veri', glyph: '🔌', dir: 'right' },
  { id: 'problems', component: 'problems', title: 'Sorunlar', glyph: '⚠', dir: 'below' },
  { id: 'console', component: 'console', title: 'Konsol', glyph: '⌗', dir: 'below' },
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
    <div className="h-full overflow-auto bg-[var(--color-bg-secondary)] p-2">
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

/** Blueprint document (inline React Flow, lazy). */
function BlueprintPanel() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-tertiary)]">
          Blueprint yükleniyor…
        </div>
      }
    >
      <BlueprintCanvas />
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
  toolbox: ToolboxPanel,
  outline: OutlineDoc,
  data: DataDoc,
  problems: ProblemsDoc,
  console: ConsoleDoc,
  properties: PropertiesPanel,
};

/** The docking workspace. */
export function StudioDock() {
  const apiRef = useRef<DockviewApi | null>(null);
  const blocks = useDashboardStore((s) => s.activeDashboard?.blocks);

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

  return (
    <div className="flex h-full w-full flex-col">
      {/* View toolbar — reopen tool windows + reset layout */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-2 py-1">
        <span className="mr-1 flex items-center gap-1 pl-1 pr-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
          Pencereler
        </span>
        {TOOL_WINDOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            title={`${w.title} — aç/odakla`}
            onClick={() => apiRef.current && ensureToolWindow(apiRef.current, w)}
            className="flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-[11px] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-primary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            <span className="text-[11px] leading-none opacity-80">{w.glyph}</span>
            {w.title}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={resetLayout}
          title="Pencere yerleşimini varsayılana döndür"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 7a4 4 0 104-4M3 7V4M3 7h3"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Yerleşimi sıfırla
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <DockviewReact
          components={COMPONENTS}
          onReady={onReady}
          theme={themeVisualStudio}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
