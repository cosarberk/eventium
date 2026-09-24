/**
 * @fileoverview useSeedPageVariables — loads a page's persisted runtime
 * variables into the global variable store when the active page changes.
 *
 * Variables live on the page (in its `layout.variables` blob), so a page opened
 * in the builder, shown on a live wall, or served through a public broadcast
 * link all arrive already parametrized. Seeding is keyed on the page id: it runs
 * once per page switch and never clobbers unsaved edits on the current page.
 */
import { useEffect, useRef } from 'react';
import { readLayoutVariables, useVariablesStore } from '@/storage/variables.store';

/**
 * Seeds the variable store from a page's layout whenever the page id changes.
 * @param pageId - The active page id (undefined disables seeding).
 * @param layout - The active page's `layout` blob (read for `variables`).
 */
export function useSeedPageVariables(pageId: string | undefined, layout: unknown): void {
  const setAll = useVariablesStore((s) => s.setAll);
  // Kept in a ref so the effect can read the latest layout without re-seeding
  // on every render — it must fire only when the page id actually changes.
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    if (!pageId) return;
    setAll(readLayoutVariables(layoutRef.current));
  }, [pageId, setAll]);
}
