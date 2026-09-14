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
import { OutlinePanel } from './OutlinePanel';
import { Palette } from './Palette';

const BlueprintCanvas = lazy(() =>
  import('@/components/blueprint/BlueprintModal').then((m) => ({ default: m.BlueprintCanvas })),
);

const LAYOUT_KEY = 'eventium-dock-layout-v2';

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
  code: CodePanel,
  blueprint: BlueprintPanel,
  toolbox: ToolboxPanel,
  outline: OutlineDoc,
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

    if (!restored) {
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

  return (
    <DockviewReact
      components={COMPONENTS}
      onReady={onReady}
      theme={themeVisualStudio}
      className="h-full w-full"
    />
  );
}
