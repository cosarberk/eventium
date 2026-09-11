/**
 * @fileoverview Free-canvas viewport — the pro-tool design surface.
 *
 * An infinite, pannable/zoomable canvas (Figma / SolidWorks feel) where blocks
 * are positioned in absolute pixels (`block.options.frame`). Supports:
 *  - pan (drag empty canvas / wheel) and zoom (⌘/Ctrl + wheel, buttons, fit),
 *  - direct-manipulation move with grid + sibling-edge snapping and live
 *    alignment guides,
 *  - 8-handle resize with grid snapping,
 *  - marquee-free click selection, a floating per-block toolbar, and palette
 *    drop at the cursor.
 *
 * Geometry lives in `options.frame` so the grid model (and live/broadcast) is
 * untouched; this renderer owns the `free` layout mode.
 */
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { BlockContent } from '@/components/design/BlockRenderer';
import { useDashboardStore } from '@/storage/dashboard.store';
import type { DashboardBlock } from '@/types';

/** Absolute canvas geometry, in surface pixels. */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GRID = 8;
const SNAP = 6;
const MIN_W = 48;
const MIN_H = 36;

/** Read a block's frame, defaulting from its grid position on first use. */
function frameOf(block: DashboardBlock): Frame {
  const f = (block.options as { frame?: Partial<Frame> }).frame;
  if (f && typeof f.x === 'number' && typeof f.y === 'number') {
    return { x: f.x, y: f.y, w: f.w ?? 320, h: f.h ?? 200 };
  }
  // Seed from the grid layout so migrated pages don't pile up at the origin.
  return {
    x: 40 + block.position.x * 96,
    y: 40 + block.position.y * 56,
    w: Math.max(MIN_W, block.size.w * 96 - 12),
    h: Math.max(MIN_H, block.size.h * 56 - 12),
  };
}

const round = (n: number) => Math.round(n / GRID) * GRID;

/** The eight resize handles and the frame edges each drives. */
const HANDLES = [
  { id: 'nw', cx: 0, cy: 0, cursor: 'nwse-resize' },
  { id: 'n', cx: 0.5, cy: 0, cursor: 'ns-resize' },
  { id: 'ne', cx: 1, cy: 0, cursor: 'nesw-resize' },
  { id: 'e', cx: 1, cy: 0.5, cursor: 'ew-resize' },
  { id: 'se', cx: 1, cy: 1, cursor: 'nwse-resize' },
  { id: 's', cx: 0.5, cy: 1, cursor: 'ns-resize' },
  { id: 'sw', cx: 0, cy: 1, cursor: 'nesw-resize' },
  { id: 'w', cx: 0, cy: 0.5, cursor: 'ew-resize' },
] as const;

type HandleId = (typeof HANDLES)[number]['id'];

interface DragState {
  mode: 'move' | 'resize' | 'pan';
  id?: string;
  handle?: HandleId;
  startX: number;
  startY: number;
  startFrame?: Frame;
  startTx?: number;
  startTy?: number;
}

/** Props for {@link FreeCanvas}. */
export interface FreeCanvasProps {
  blocks: readonly DashboardBlock[];
  editing: boolean;
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
  onOpenEditor?: (id: string) => void;
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  /** Add a component (dragged from the palette) at a surface point. */
  onAddAt?: (componentType: string, x: number, y: number) => void;
}

/** The free-canvas viewport. */
export function FreeCanvas({
  blocks,
  editing,
  selectedId,
  onSelect,
  onOpenEditor,
  onRemove,
  onConfigure,
  onAddAt,
}: FreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const updateBlockFrame = useDashboardStore((s) => s.updateBlockFrame);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [live, setLive] = useState<Record<string, Frame>>({});
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const drag = useRef<DragState | null>(null);

  const frame = useCallback((b: DashboardBlock): Frame => live[b.id] ?? frameOf(b), [live]);

  /** Convert a client point to surface (canvas) coordinates. */
  const toSurface = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const rx = clientX - (rect?.left ?? 0);
      const ry = clientY - (rect?.top ?? 0);
      return { x: (rx - tx) / scale, y: (ry - ty) / scale };
    },
    [tx, ty, scale],
  );

  // ── Pointer move/up (window-level while dragging) ──
  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;

      if (d.mode === 'pan') {
        setTx((d.startTx ?? 0) + (e.clientX - d.startX));
        setTy((d.startTy ?? 0) + (e.clientY - d.startY));
        return;
      }
      if (!d.id || !d.startFrame) return;
      const sf = d.startFrame;
      const others = blocks.filter((b) => b.id !== d.id).map(frame);

      if (d.mode === 'move') {
        let nx = sf.x + dx;
        let ny = sf.y + dy;
        const snapped = snapMove({ ...sf, x: nx, y: ny }, others);
        nx = snapped.x;
        ny = snapped.y;
        setGuides(snapped.guides);
        setLive((l) => ({ ...l, [d.id as string]: { ...sf, x: nx, y: ny } }));
      } else if (d.mode === 'resize' && d.handle) {
        const next = resizeFrame(sf, d.handle, dx, dy);
        setGuides({ v: [], h: [] });
        setLive((l) => ({ ...l, [d.id as string]: next }));
      }
    },
    [scale, blocks, frame],
  );

  const onPointerUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    setGuides({ v: [], h: [] });
    document.body.style.cursor = '';
    if (d?.id) {
      const f = live[d.id];
      if (f) updateBlockFrame(d.id, f);
      setLive((l) => {
        const next = { ...l };
        delete next[d.id as string];
        return next;
      });
    }
  }, [live, updateBlockFrame]);

  useLayoutEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  // ── Wheel: pan by default, zoom with ⌘/Ctrl (around the cursor) ──
  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      const px = e.clientX - (rect?.left ?? 0);
      const py = e.clientY - (rect?.top ?? 0);
      const factor = Math.exp(-e.deltaY * 0.0015);
      const ns = Math.min(3, Math.max(0.2, scale * factor));
      // keep the point under the cursor stable
      setTx(px - ((px - tx) * ns) / scale);
      setTy(py - ((py - ty) * ns) / scale);
      setScale(ns);
    } else {
      setTx((v) => v - e.deltaX);
      setTy((v) => v - e.deltaY);
    }
  };

  const startMove = (e: ReactPointerEvent, b: DashboardBlock) => {
    if (!editing) return;
    const target = e.target as HTMLElement;
    if (target.closest('.eventium-no-drag') || target.closest('[data-handle]')) return;
    e.stopPropagation();
    onSelect(b.id);
    drag.current = {
      mode: 'move',
      id: b.id,
      startX: e.clientX,
      startY: e.clientY,
      startFrame: frame(b),
    };
    document.body.style.cursor = 'grabbing';
  };

  const startResize = (e: ReactPointerEvent, b: DashboardBlock, handle: HandleId) => {
    e.stopPropagation();
    drag.current = {
      mode: 'resize',
      id: b.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startFrame: frame(b),
    };
  };

  const startPan = (e: ReactPointerEvent) => {
    // Only when clicking empty canvas.
    if (e.target !== e.currentTarget) return;
    onSelect(null);
    if (!editing && e.button !== 1) {
      // still allow panning in view mode
    }
    drag.current = { mode: 'pan', startX: e.clientX, startY: e.clientY, startTx: tx, startTy: ty };
    document.body.style.cursor = 'grabbing';
  };

  const zoomBy = (f: number) => setScale((s) => Math.min(3, Math.max(0.2, s * f)));
  const resetView = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  /** Zoom + center so all blocks fit the viewport. */
  const zoomToFit = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || blocks.length === 0) {
      resetView();
      return;
    }
    const fs = blocks.map(frameOf);
    const minX = Math.min(...fs.map((f) => f.x));
    const minY = Math.min(...fs.map((f) => f.y));
    const maxX = Math.max(...fs.map((f) => f.x + f.w));
    const maxY = Math.max(...fs.map((f) => f.y + f.h));
    const pad = 48;
    const ns = Math.min(
      2,
      Math.max(
        0.2,
        Math.min(
          (rect.width - pad * 2) / (maxX - minX || 1),
          (rect.height - pad * 2) / (maxY - minY || 1),
        ),
      ),
    );
    setScale(ns);
    setTx(pad - minX * ns);
    setTy(pad - minY * ns);
  };

  // ── Keyboard: nudge (arrows), delete (Del/Backspace) on the selection ──
  useEffect(() => {
    if (!editing || !selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const b = blocks.find((x) => x.id === selectedId);
      if (!b) return;
      const f = frameOf(b);
      const step = e.shiftKey ? 1 : GRID;
      if (e.key === 'ArrowLeft') updateBlockFrame(selectedId, { ...f, x: f.x - step });
      else if (e.key === 'ArrowRight') updateBlockFrame(selectedId, { ...f, x: f.x + step });
      else if (e.key === 'ArrowUp') updateBlockFrame(selectedId, { ...f, y: f.y - step });
      else if (e.key === 'ArrowDown') updateBlockFrame(selectedId, { ...f, y: f.y + step });
      else if (e.key === 'Delete' || e.key === 'Backspace') onRemove?.(selectedId);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, selectedId, blocks, updateBlockFrame, onRemove]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pan/zoom surface; block controls provide keyboard access
    <div
      ref={containerRef}
      className="relative h-[70vh] w-full overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]"
      onWheel={onWheel}
      onPointerDown={startPan}
      onDragOver={(e) => {
        if (onAddAt) e.preventDefault();
      }}
      onDrop={(e) => {
        const type = e.dataTransfer.getData('text/plain');
        if (type && onAddAt) {
          const p = toSurface(e.clientX, e.clientY);
          onAddAt(type, round(p.x), round(p.y));
        }
      }}
    >
      {/* Transformed surface */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
      >
        {/* Dot grid backdrop (scales with the surface) */}
        <div
          className="pointer-events-none absolute -z-10"
          style={{
            left: -2000,
            top: -2000,
            width: 8000,
            height: 8000,
            backgroundImage: 'radial-gradient(var(--color-border-primary) 1px, transparent 1px)',
            backgroundSize: `${GRID * 3}px ${GRID * 3}px`,
            opacity: 0.5,
          }}
        />

        {/* Alignment guides */}
        {guides.v.map((x) => (
          <div
            key={`v${x}`}
            className="pointer-events-none absolute bg-brand-500"
            style={{ left: x, top: -2000, width: 1, height: 8000 }}
          />
        ))}
        {guides.h.map((y) => (
          <div
            key={`h${y}`}
            className="pointer-events-none absolute bg-brand-500"
            style={{ left: -2000, top: y, width: 8000, height: 1 }}
          />
        ))}

        {/* Blocks */}
        {blocks.map((b) => {
          const f = frame(b);
          const selected = editing && selectedId === b.id;
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: canvas object; selection/keyboard via inspector
            // biome-ignore lint/a11y/useKeyWithClickEvents: canvas object; selection/keyboard via inspector
            <div
              key={b.id}
              onPointerDown={(e) => startMove(e, b)}
              onDoubleClick={() => onOpenEditor?.(b.id)}
              className={`group absolute overflow-hidden rounded-lg bg-[var(--color-bg-elevated)] shadow-sm transition-shadow ${
                selected
                  ? 'outline outline-2 outline-brand-500'
                  : 'outline outline-1 outline-transparent hover:outline-brand-500/40'
              } ${editing ? 'cursor-grab active:cursor-grabbing' : ''}`}
              style={{ left: f.x, top: f.y, width: f.w, height: f.h }}
            >
              <div className="h-full w-full overflow-auto">
                <BlockContent block={b} interactive={!editing} />
              </div>

              {editing && (
                <div
                  className={`absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                    selected ? 'opacity-100' : ''
                  }`}
                >
                  {onOpenEditor && (
                    <CanvasBtn label="Kod / Blueprint" onClick={() => onOpenEditor(b.id)}>
                      {'</>'}
                    </CanvasBtn>
                  )}
                  {onConfigure && (
                    <CanvasBtn label="Ayarlar" onClick={() => onConfigure(b.id)}>
                      ⚙
                    </CanvasBtn>
                  )}
                  {onRemove && (
                    <CanvasBtn label="Sil" danger onClick={() => onRemove(b.id)}>
                      ✕
                    </CanvasBtn>
                  )}
                </div>
              )}

              {/* Resize handles (selected only) */}
              {selected &&
                HANDLES.map((h) => (
                  <span
                    key={h.id}
                    data-handle={h.id}
                    onPointerDown={(e) => startResize(e, b, h.id)}
                    className="absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-brand-500 bg-white"
                    style={{ left: `${h.cx * 100}%`, top: `${h.cy * 100}%`, cursor: h.cursor }}
                  />
                ))}
            </div>
          );
        })}
      </div>

      {/* Viewport controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]/90 p-1 text-xs shadow-sm backdrop-blur">
        <ViewBtn label="Uzaklaş" onClick={() => zoomBy(1 / 1.2)}>
          −
        </ViewBtn>
        <button
          type="button"
          onClick={resetView}
          className="min-w-[46px] rounded px-1.5 py-1 font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          {Math.round(scale * 100)}%
        </button>
        <ViewBtn label="Yakınlaş" onClick={() => zoomBy(1.2)}>
          +
        </ViewBtn>
        <span className="mx-0.5 h-4 w-px bg-[var(--color-border-primary)]" />
        <button
          type="button"
          onClick={zoomToFit}
          title="Sığdır"
          className="rounded px-1.5 py-1 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          Sığdır
        </button>
      </div>

      {editing && blocks.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <span className="text-3xl opacity-30">⬚</span>
          <p className="max-w-xs text-sm text-[var(--color-text-tertiary)]">
            Soldaki paletten bir bileşeni tuvale <b>sürükle-bırak</b>. İstediğin yere koy,
            boyutlandır, hizala. Çift tık → kod/blueprint.
          </p>
        </div>
      )}
    </div>
  );
}

/** Snap a moved frame to the grid and to sibling edges; return guide lines. */
function snapMove(
  f: Frame,
  others: Frame[],
): { x: number; y: number; guides: { v: number[]; h: number[] } } {
  let x = round(f.x);
  let y = round(f.y);
  const v: number[] = [];
  const h: number[] = [];

  const myV = [f.x, f.x + f.w / 2, f.x + f.w];
  const myH = [f.y, f.y + f.h / 2, f.y + f.h];
  const offV = [0, f.w / 2, f.w];
  const offH = [0, f.h / 2, f.h];

  for (const o of others) {
    const oV = [o.x, o.x + o.w / 2, o.x + o.w];
    const oH = [o.y, o.y + o.h / 2, o.y + o.h];
    myV.forEach((mv, i) => {
      const off = offV[i] ?? 0;
      for (const ov of oV) {
        if (Math.abs(mv - ov) <= SNAP) {
          x = ov - off;
          v.push(ov);
        }
      }
    });
    myH.forEach((mh, i) => {
      const off = offH[i] ?? 0;
      for (const oh of oH) {
        if (Math.abs(mh - oh) <= SNAP) {
          y = oh - off;
          h.push(oh);
        }
      }
    });
  }
  return { x, y, guides: { v: [...new Set(v)], h: [...new Set(h)] } };
}

/** Apply a resize-handle drag to a frame, keeping min sizes and grid snapping. */
function resizeFrame(sf: Frame, handle: HandleId, dx: number, dy: number): Frame {
  let { x, y, w, h } = sf;
  const east = handle.includes('e');
  const west = handle.includes('w');
  const north = handle.includes('n');
  const south = handle.includes('s');

  if (east) w = Math.max(MIN_W, round(sf.w + dx));
  if (south) h = Math.max(MIN_H, round(sf.h + dy));
  if (west) {
    const nx = round(sf.x + dx);
    w = Math.max(MIN_W, sf.x + sf.w - nx);
    x = sf.x + sf.w - w;
  }
  if (north) {
    const ny = round(sf.y + dy);
    h = Math.max(MIN_H, sf.y + sf.h - ny);
    y = sf.y + sf.h - h;
  }
  return { x, y, w, h };
}

/** A floating per-block toolbar button (no-drag). */
function CanvasBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`eventium-no-drag flex h-6 min-w-6 items-center justify-center rounded-md bg-[var(--color-bg-elevated)]/95 px-1 font-mono text-[11px] text-[var(--color-text-tertiary)] shadow-sm backdrop-blur transition-colors hover:text-[var(--color-text-primary)] ${
        danger ? 'hover:text-red-500' : 'hover:text-brand-500'
      }`}
    >
      {children}
    </button>
  );
}

/** A viewport zoom-control button. */
function ViewBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
    >
      {children}
    </button>
  );
}
