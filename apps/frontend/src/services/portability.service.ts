/**
 * @fileoverview Service layer for page export/import (portability).
 *
 * A page can be exported to a portable {@link PageSpec} — a JSON document with
 * server identity and instance-specific binding fields stripped, plus the list
 * of source *types* it references ({@link PageSpec.requiredSources}). Importing
 * re-materializes the spec as a new dashboard, re-binding each required source
 * type to a locally installed plugin instance via a `sourceType → instanceId`
 * mapping.
 */
import { urqlClient } from '@/api/client';
import { EXPORT_PAGE, IMPORT_PAGE } from '@/api/graphql';
import type { PageSpec } from '@/types';

/** A `sourceType → plugin instance id` mapping used to re-bind an imported spec. */
export type SourceMapping = Record<string, string>;

/**
 * Exports a page as a portable {@link PageSpec}.
 * @param id - The page (dashboard) id to export.
 * @returns The portable spec, safe to serialize and share.
 */
export async function exportPage(id: string): Promise<PageSpec> {
  const result = await urqlClient.query(EXPORT_PAGE, { id }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.exportPage as PageSpec;
}

/**
 * Imports a portable {@link PageSpec} as a new page.
 * @param spec - The portable spec (typically parsed from an uploaded file).
 * @param sourceMapping - Maps every required source type to a local instance id.
 * @returns The newly created page's id and name.
 */
export async function importPage(
  spec: PageSpec,
  sourceMapping: SourceMapping,
): Promise<{ id: string; name: string }> {
  const result = await urqlClient.mutation(IMPORT_PAGE, { spec, sourceMapping }).toPromise();
  if (result.error) throw new Error(result.error.message);
  return result.data.importPage as { id: string; name: string };
}
