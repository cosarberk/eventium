/**
 * @fileoverview Read-only free-canvas renderer for live / broadcast views.
 *
 * Renders a free-layout page's blocks at their absolute frames, auto-scaled to
 * fit and center within the available space (TV-wall friendly). No interaction —
 * the editing surface lives in {@link FreeCanvas}. Uses the same
 * {@link BlockContent} as every other view, so components render identically.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { BlockContent } from '@/components/design/BlockRenderer';
import type { DashboardBlock } from '@/types';
import { frameOf } from './FreeCanvas';

interface FreeCanvasViewProps {
  blocks: readonly DashboardBlock[];
  /** True on the TV/broadcast view (dark panel surfaces). */
  isLive?: boolean;
}

/** Fit-to-view, read-only render of an absolutely-positioned page. */
export function FreeCanvasView({ blocks, isLive }: FreeCanvasViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ scale: 1, tx: 0, ty: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || blocks.length === 0) return;
    const fit = () => {
      const fs = blocks.map(frameOf);
      const minX = Math.min(...fs.map((f) => f.x));
      const minY = Math.min(...fs.map((f) => f.y));
      const maxX = Math.max(...fs.map((f) => f.x + f.w));
      const maxY = Math.max(...fs.map((f) => f.y + f.h));
      const pad = 24;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const bw = maxX - minX || 1;
      const bh = maxY - minY || 1;
      const scale = Math.max(0.1, Math.min(4, Math.min((w - pad * 2) / bw, (h - pad * 2) / bh)));
      setT({
        scale,
        tx: (w - bw * scale) / 2 - minX * scale,
        ty: (h - bh * scale) / 2 - minY * scale,
      });
    };
    fit();
    const ob = new ResizeObserver(fit);
    ob.observe(el);
    return () => ob.disconnect();
  }, [blocks]);

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${t.tx}px, ${t.ty}px) scale(${t.scale})` }}
      >
        {blocks.map((b) => {
          const f = frameOf(b);
          return (
            <div
              key={b.id}
              className={`absolute overflow-hidden rounded-lg ${
                isLive
                  ? 'border border-white/10 bg-white/[0.04]'
                  : 'bg-[var(--color-bg-elevated)] shadow-sm'
              }`}
              style={{ left: f.x, top: f.y, width: f.w, height: f.h }}
            >
              <BlockContent block={b} isLive={isLive} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
