/**
 * @fileoverview Designer canvas surface — the free viewport or grid artboard.
 *
 * Reused by the docking manager's Designer document and the read-only page view.
 * Reads blocks/selection/handlers from the stores; `onOpenCode` opens a control's
 * code document (the docking manager decides where).
 */
import { BlockGrid } from '@/components/design/BlockGrid';
import { useDashboardStore } from '@/storage/dashboard.store';
import { FreeCanvas } from './FreeCanvas';
import { readProjectTypeId } from './project';
import { getProjectType } from './project-types';

interface CanvasSurfaceProps {
  editing: boolean;
  /** Open a control's code document (double-click / toolbar). */
  onOpenCode?: (id: string) => void;
}

/** The designer canvas (free or grid), driven by the active project's layout mode. */
export function CanvasSurface({ editing, onOpenCode }: CanvasSurfaceProps) {
  const activeDashboard = useDashboardStore((s) => s.activeDashboard);
  const selectedId = useDashboardStore((s) => s.selectedBlockId);
  const selectBlock = useDashboardStore((s) => s.selectBlock);
  const addBlock = useDashboardStore((s) => s.addBlock);
  const addBlockWithFrame = useDashboardStore((s) => s.addBlockWithFrame);
  const removeBlock = useDashboardStore((s) => s.removeBlock);
  const updateBlockLayout = useDashboardStore((s) => s.updateBlockLayout);

  const blocks = activeDashboard?.blocks ?? [];
  const layoutMode =
    getProjectType(readProjectTypeId(activeDashboard?.layout))?.layoutMode ?? 'grid';

  if (layoutMode === 'free') {
    return (
      <FreeCanvas
        blocks={blocks}
        editing={editing}
        selectedId={selectedId}
        onSelect={(id) => selectBlock(id)}
        onOpenEditor={(id) => {
          selectBlock(id);
          onOpenCode?.(id);
        }}
        onRemove={removeBlock}
        onConfigure={(id) => selectBlock(id)}
        onAddAt={(type, x, y) => addBlockWithFrame(type, { x, y })}
      />
    );
  }

  return (
    <div className="h-full overflow-auto bg-[var(--color-bg-secondary)] p-6 [background-image:radial-gradient(var(--color-border-primary)_1px,transparent_1px)] [background-size:16px_16px]">
      {/* Artboard — a bounded 'page' surface, centered like a document */}
      <div className="relative mx-auto min-h-[640px] w-full max-w-[1200px] rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-1.5 shadow-2xl shadow-black/30">
        <BlockGrid
          blocks={blocks}
          editing={editing}
          layoutMode={layoutMode}
          selectedId={selectedId}
          onExternalDrop={(type, at) => addBlock(type, at)}
          onSelectBlock={(id) => selectBlock(id)}
          onOpenBlockEditor={(id) => {
            selectBlock(id);
            onOpenCode?.(id);
          }}
          onLayoutChange={updateBlockLayout}
          onRemoveBlock={removeBlock}
          onConfigureBlock={(id) => selectBlock(id)}
        />
        {editing && blocks.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl opacity-30">⬚</span>
            <p className="max-w-xs text-sm text-[var(--color-text-tertiary)]">
              Araç kutusundan bir bileşeni bu sayfaya <b>sürükle-bırak</b>. Çift tık →
              kod/blueprint.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
