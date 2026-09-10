/**
 * @fileoverview Blueprint overlay (light) — listens for the `eventium:blueprint`
 * window event (⌘K) and lazily loads the heavy React Flow editor only on first
 * open, keeping it out of the main bundle.
 */
import { lazy, Suspense, useEffect, useState } from 'react';

const BlueprintModal = lazy(() => import('./BlueprintModal'));

/** Mounts always (cheap); loads the editor chunk on demand. */
export function BlueprintOverlay() {
  const [open, setOpen] = useState(false);

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

  if (!open) return null;

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[var(--color-bg-overlay)] backdrop-blur-sm">
          <span className="text-sm text-[var(--color-text-secondary)]">Blueprint yükleniyor…</span>
        </div>
      }
    >
      <BlueprintModal onClose={() => setOpen(false)} />
    </Suspense>
  );
}
