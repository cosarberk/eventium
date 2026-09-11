/**
 * @fileoverview Free-canvas viewport — the pro-tool design surface.
 *
 * An infinite, pannable/zoomable canvas (Figma / SolidWorks feel) where blocks
 * are positioned in absolute pixels (`block.options.frame`). Supports:
 *  - pan (Alt/middle-drag or wheel) and zoom (⌘/Ctrl + wheel, buttons, fit),
 *  - marquee selection on empty-drag, shift-click to add/remove,
 *  - direct-manipulation move (single: grid + sibling-edge snap with live
 *    alignment guides; multi: move the whole selection together),
 *  - 8-handle resize, keyboard nudge/delete, and an alignment toolbar,
 *  - a floating per-block toolbar and palette drop at the cursor.
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
export function frameOf(block: DashboardBlock): Frame {
  const f = (block.options as { frame?: Partial<Frame> }).frame;
  if (f && typeof f.x === 'number' && typeof f.y === 'number') {
    return { x: f.x, y: f.y, w: f.w ?? 320, h: f.h ?? 200 };
  }
  return {
    x: 40 + block.position.x * 96,
    y: 40 + block.position.y * 56,
    w: Math.max(MIN_W, block.size.w * 96 - 12),
    h: Math.max(MIN_H, block.size.h * 56 - 12),
  };
}

const round = (n: number) => Math.round(n / GRID) * GRID;

/** Ruler thickness in px. */
const RULER = 18;

/** Compute ruler ticks (screen positions + surface labels) for one axis. */
function ticksFor(offset: number, scale: number, length: number): { pos: number; label: number }[] {
  const steps = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  const step = steps.find((s) => s * scale >= 64) ?? 5000;
  const startSurface = Math.floor(-offset / scale / step) * step;
  const ticks: { pos: number; label: number }[] = [];
  for (let sx = startSurface; sx * scale + offset < length + 40; sx += step) {
    ticks.push({ pos: sx * scale + offset, label: sx });
  }
  return ticks;
}

/** The eight resize handles. */
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
type AlignKind = 'left' | 'hcenter' | 'right' | 'top' | 'vmiddle' | 'bottom';

interface DragState {
  mode: 'move' | 'resize' | 'pan' | 'marquee';
  id?: string;
  ids?: string[];
  handle?: HandleId;
  startX: number;
  startY: number;
  startFrame?: Frame;
  startFrames?: Record<string, Frame>;
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
  const addClones = useDashboardStore((s) => s.addClones);
  const clipboard = useRef<DashboardBlock[]>([]);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [live, setLive] = useState<Record<string, Frame>>({});
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );
  const drag = useRef<DragState | null>(null);

  const [size, setSize] = useState({ w: 0, h: 0 });

  // Latest view transform, read by pointer handlers without re-subscribing.
  const view = useRef({ tx, ty, scale });
  view.current = { tx, ty, scale };

  /** Track the viewport size so the rulers can compute visible ticks. */
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ob = new ResizeObserver(update);
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  const frameFor = useCallback((b: DashboardBlock): Frame => live[b.id] ?? frameOf(b), [live]);

  /** Client point → surface (canvas) coordinates, using the latest transform. */
  const toSurface = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const { tx: vx, ty: vy, scale: vs } = view.current;
    return {
      x: (clientX - (rect?.left ?? 0) - vx) / vs,
      y: (clientY - (rect?.top ?? 0) - vy) / vs,
    };
  }, []);

  /** Keep the local selection in sync when the primary selection changes. */
  useEffect(() => {
    if (!selectedId) return;
    setSel((s) => (s.has(selectedId) ? s : new Set([selectedId])));
  }, [selectedId]);

  // ── Global pointer move/up while dragging ──
  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const vs = view.current.scale;
      const dx = (e.clientX - d.startX) / vs;
      const dy = (e.clientY - d.startY) / vs;

      if (d.mode === 'pan') {
        setTx((d.startTx ?? 0) + (e.clientX - d.startX));
        setTy((d.startTy ?? 0) + (e.clientY - d.startY));
        return;
      }
      if (d.mode === 'marquee') {
        const p = toSurface(e.clientX, e.clientY);
        setMarquee((m) => (m ? { ...m, x1: p.x, y1: p.y } : m));
        return;
      }
      if (!d.id || !d.startFrame) return;

      if (d.mode === 'move') {
        if (d.ids && d.ids.length > 1 && d.startFrames) {
          const rdx = round(dx);
          const rdy = round(dy);
          setGuides({ v: [], h: [] });
          setLive((l) => {
            const next = { ...l };
            for (const id of d.ids as string[]) {
              const sf = (d.startFrames as Record<string, Frame>)[id];
              if (sf) next[id] = { ...sf, x: sf.x + rdx, y: sf.y + rdy };
            }
            return next;
          });
        } else {
          const sf = d.startFrame;
          const others = blocks.filter((b) => b.id !== d.id).map(frameFor);
          const snapped = snapMove({ ...sf, x: sf.x + dx, y: sf.y + dy }, others);
          setGuides(snapped.guides);
          setLive((l) => ({ ...l, [d.id as string]: { ...sf, x: snapped.x, y: snapped.y } }));
        }
      } else if (d.mode === 'resize' && d.handle) {
        setGuides({ v: [], h: [] });
        setLive((l) => ({
          ...l,
          [d.id as string]: resizeFrame(d.startFrame as Frame, d.handle as HandleId, dx, dy),
        }));
      }
    },
    [blocks, frameFor, toSurface],
  );

  const onPointerUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    setGuides({ v: [], h: [] });
    document.body.style.cursor = '';

    if (d?.mode === 'marquee') {
      setMarquee((m) => {
        if (m) {
          const rx = Math.min(m.x0, m.x1);
          const ry = Math.min(m.y0, m.y1);
          const rw = Math.abs(m.x1 - m.x0);
          const rh = Math.abs(m.y1 - m.y0);
          if (rw > 3 || rh > 3) {
            const hit = blocks.filter((b) => {
              const f = frameOf(b);
              return f.x < rx + rw && f.x + f.w > rx && f.y < ry + rh && f.y + f.h > ry;
            });
            const ids = hit.map((b) => b.id);
            setSel(new Set(ids));
            onSelect(ids[0] ?? null);
          } else {
            setSel(new Set());
            onSelect(null);
          }
        }
        return null;
      });
      return;
    }

    // Commit every frame touched during the drag (single or multi).
    setLive((l) => {
      for (const [id, f] of Object.entries(l)) updateBlockFrame(id, f);
      return {};
    });
  }, [blocks, onSelect, updateBlockFrame]);

  useLayoutEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  // ── Wheel: pan by default, zoom with ⌘/Ctrl around the cursor ──
  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      const px = e.clientX - (rect?.left ?? 0);
      const py = e.clientY - (rect?.top ?? 0);
      const ns = Math.min(3, Math.max(0.2, scale * Math.exp(-e.deltaY * 0.0015)));
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

    if (e.shiftKey) {
      // Toggle in the selection; no drag.
      setSel((s) => {
        const next = new Set(s);
        if (next.has(b.id)) next.delete(b.id);
        else next.add(b.id);
        onSelect(next.size ? (next.has(b.id) ? b.id : ([...next][0] ?? null)) : null);
        return next;
      });
      return;
    }

    const ids = sel.has(b.id) && sel.size > 1 ? [...sel] : [b.id];
    if (ids.length === 1) {
      setSel(new Set([b.id]));
    }
    onSelect(b.id);
    const startFrames: Record<string, Frame> = {};
    for (const id of ids) {
      const blk = blocks.find((x) => x.id === id);
      if (blk) startFrames[id] = frameFor(blk);
    }
    drag.current = {
      mode: 'move',
      id: b.id,
      ids,
      startFrames,
      startX: e.clientX,
      startY: e.clientY,
      startFrame: frameFor(b),
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
      startFrame: frameFor(b),
    };
  };

  const onBackgroundPointerDown = (e: ReactPointerEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.altKey || e.button === 1) {
      // Pan.
      drag.current = {
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        startTx: tx,
        startTy: ty,
      };
      document.body.style.cursor = 'grabbing';
      return;
    }
    // Marquee select.
    onSelect(null);
    setSel(new Set());
    const p = toSurface(e.clientX, e.clientY);
    setMarquee({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    drag.current = { mode: 'marquee', startX: e.clientX, startY: e.clientY };
  };

  const zoomBy = (f: number) => setScale((s) => Math.min(3, Math.max(0.2, s * f)));
  const resetView = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };
  const zoomToFit = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || blocks.length === 0) return resetView();
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

  /** Align every selected block within the selection's bounding box. */
  const align = (kind: AlignKind) => {
    const ids = [...sel];
    if (ids.length < 2) return;
    const items = ids
      .map((id) => blocks.find((b) => b.id === id))
      .filter((b): b is DashboardBlock => Boolean(b))
      .map((b) => ({ id: b.id, f: frameOf(b) }));
    const minX = Math.min(...items.map((o) => o.f.x));
    const maxX = Math.max(...items.map((o) => o.f.x + o.f.w));
    const minY = Math.min(...items.map((o) => o.f.y));
    const maxY = Math.max(...items.map((o) => o.f.y + o.f.h));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    for (const { id, f } of items) {
      const nf = { ...f };
      if (kind === 'left') nf.x = minX;
      else if (kind === 'right') nf.x = maxX - f.w;
      else if (kind === 'hcenter') nf.x = Math.round(cx - f.w / 2);
      else if (kind === 'top') nf.y = minY;
      else if (kind === 'bottom') nf.y = maxY - f.h;
      else if (kind === 'vmiddle') nf.y = Math.round(cy - f.h / 2);
      updateBlockFrame(id, nf);
    }
  };

  // ── Keyboard: nudge (arrows) + delete on the whole selection ──
  useEffect(() => {
    if (!editing || sel.size === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const ids = [...sel];
      if (e.key === 'Delete' || e.key === 'Backspace') {
        for (const id of ids) onRemove?.(id);
        e.preventDefault();
        return;
      }
      const step = e.shiftKey ? 1 : GRID;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
      if (dx === 0 && dy === 0) return;
      for (const id of ids) {
        const b = blocks.find((x) => x.id === id);
        if (b) {
          const f = frameOf(b);
          updateBlockFrame(id, { ...f, x: f.x + dx, y: f.y + dy });
        }
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, sel, blocks, updateBlockFrame, onRemove]);

  // ── Clipboard: duplicate (⌘D), copy (⌘C), paste (⌘V) ──
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === 'd') {
        const snaps = blocks.filter((b) => sel.has(b.id));
        if (snaps.length) {
          const ids = addClones(snaps, GRID * 2);
          setSel(new Set(ids));
          onSelect(ids[ids.length - 1] ?? null);
        }
        e.preventDefault();
      } else if (k === 'c') {
        clipboard.current = blocks.filter((b) => sel.has(b.id));
        e.preventDefault();
      } else if (k === 'v') {
        if (clipboard.current.length) {
          const ids = addClones(clipboard.current, GRID * 3);
          setSel(new Set(ids));
          onSelect(ids[ids.length - 1] ?? null);
        }
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, sel, blocks, addClones, onSelect]);

  const mq = marquee
    ? {
        x: Math.min(marquee.x0, marquee.x1),
        y: Math.min(marquee.y0, marquee.y1),
        w: Math.abs(marquee.x1 - marquee.x0),
        h: Math.abs(marquee.y1 - marquee.y0),
      }
    : null;

  // Live geometry readout for a single selection.
  const readoutBlock = editing && sel.size === 1 ? blocks.find((b) => sel.has(b.id)) : undefined;
  const readout = readoutBlock ? (live[readoutBlock.id] ?? frameOf(readoutBlock)) : null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pan/marquee surface; block controls provide keyboard access
    <div
      ref={containerRef}
      className="relative h-[70vh] w-full overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]"
      onWheel={onWheel}
      onPointerDown={onBackgroundPointerDown}
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
        {/* Dot grid backdrop */}
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

        {/* Marquee */}
        {mq && (
          <div
            className="pointer-events-none absolute border border-brand-500 bg-brand-500/10"
            style={{ left: mq.x, top: mq.y, width: mq.w, height: mq.h }}
          />
        )}

        {/* Blocks */}
        {blocks.map((b) => {
          const f = frameFor(b);
          const isSel = editing && sel.has(b.id);
          const soleSel = isSel && sel.size === 1;
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: canvas object; selection/keyboard via inspector
            // biome-ignore lint/a11y/useKeyWithClickEvents: canvas object; selection/keyboard via inspector
            <div
              key={b.id}
              onPointerDown={(e) => startMove(e, b)}
              onDoubleClick={() => onOpenEditor?.(b.id)}
              className={`group absolute overflow-hidden rounded-lg bg-[var(--color-bg-elevated)] shadow-sm transition-shadow ${
                isSel
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
                    isSel ? 'opacity-100' : ''
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

              {/* Resize handles — only when a single block is selected */}
              {soleSel &&
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

      {/* Rulers (edit mode) */}
      {editing && (
        <>
          <div
            className="pointer-events-none absolute left-0 top-0 z-20 border-b border-r border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]"
            style={{ width: RULER, height: RULER }}
          />
          <div
            className="pointer-events-none absolute top-0 z-10 overflow-hidden border-b border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]/95"
            style={{ left: RULER, right: 0, height: RULER }}
          >
            {ticksFor(tx, scale, size.w).map((t) => (
              <div
                key={`tx${t.label}`}
                className="absolute top-0 h-full"
                style={{ left: t.pos - RULER }}
              >
                <span className="absolute left-1 top-0.5 text-[9px] text-[var(--color-text-tertiary)]">
                  {t.label}
                </span>
                <span className="absolute bottom-0 left-0 h-1.5 w-px bg-[var(--color-border-secondary)]" />
              </div>
            ))}
          </div>
          <div
            className="pointer-events-none absolute left-0 z-10 overflow-hidden border-r border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]/95"
            style={{ top: RULER, bottom: 0, width: RULER }}
          >
            {ticksFor(ty, scale, size.h).map((t) => (
              <div
                key={`ty${t.label}`}
                className="absolute left-0 w-full"
                style={{ top: t.pos - RULER }}
              >
                <span className="absolute left-0.5 top-0 text-[8px] leading-none text-[var(--color-text-tertiary)]">
                  {t.label}
                </span>
                <span className="absolute right-0 top-0 h-px w-1.5 bg-[var(--color-border-secondary)]" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Geometry readout (single selection) */}
      {readout && (
        <div className="absolute bottom-3 left-3 z-20 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]/95 px-2.5 py-1.5 font-mono text-[10px] text-[var(--color-text-secondary)] shadow-sm backdrop-blur">
          X {Math.round(readout.x)} · Y {Math.round(readout.y)} · W {Math.round(readout.w)} · H{' '}
          {Math.round(readout.h)}
        </div>
      )}

      {/* Alignment toolbar (multi-select) */}
      {editing && sel.size >= 2 && (
        <div className="absolute left-3 top-3 flex items-center gap-0.5 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)]/95 p-1 shadow-sm backdrop-blur">
          <span className="px-1.5 text-[10px] font-medium text-[var(--color-text-tertiary)]">
            {sel.size} seçili
          </span>
          <AlignBtn label="Sola hizala" onClick={() => align('left')}>
            ⇤
          </AlignBtn>
          <AlignBtn label="Yatay ortala" onClick={() => align('hcenter')}>
            ↔
          </AlignBtn>
          <AlignBtn label="Sağa hizala" onClick={() => align('right')}>
            ⇥
          </AlignBtn>
          <span className="mx-0.5 h-4 w-px bg-[var(--color-border-primary)]" />
          <AlignBtn label="Üste hizala" onClick={() => align('top')}>
            ⤒
          </AlignBtn>
          <AlignBtn label="Dikey ortala" onClick={() => align('vmiddle')}>
            ↕
          </AlignBtn>
          <AlignBtn label="Alta hizala" onClick={() => align('bottom')}>
            ⤓
          </AlignBtn>
        </div>
      )}

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
            boyutlandır, hizala. Çift tık → kod/blueprint. Boş alanı sürükle → çoklu seç.
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
  if (handle.includes('e')) w = Math.max(MIN_W, round(sf.w + dx));
  if (handle.includes('s')) h = Math.max(MIN_H, round(sf.h + dy));
  if (handle.includes('w')) {
    const nx = round(sf.x + dx);
    w = Math.max(MIN_W, sf.x + sf.w - nx);
    x = sf.x + sf.w - w;
  }
  if (handle.includes('n')) {
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

/** An alignment-toolbar button. */
function AlignBtn({
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
