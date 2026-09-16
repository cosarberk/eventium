/**
 * @fileoverview Project variables — seed the runtime variables store from the
 * project's first `.ev` file.
 *
 * A variables file holds a JSON object of `name: value`. When a project has one,
 * its entries are merged into the runtime variables store, so bindings can use
 * them via `$name` and they show in the Data panel's variables section.
 */
import { useEffect } from 'react';
import { useNodes } from '@/hooks/useNodes';
import { useVariablesStore } from '@/storage/variables.store';

/** Merge the project's first `.ev` file's variables into the runtime store. */
export function useProjectVariables(projectId: string | undefined): void {
  const { nodes } = useNodes(projectId);
  const setVariable = useVariablesStore((s) => s.setVariable);

  const varsNode = nodes.find((n) => n.kind === 'variables');
  const content = typeof varsNode?.data?.content === 'string' ? varsNode.data.content : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when the file content changes
  useEffect(() => {
    if (!content) return;
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            setVariable(name, String(value));
          }
        }
      }
    } catch {
      // Invalid JSON in the .ev file — ignore until it's valid.
    }
  }, [content, setVariable]);
}
