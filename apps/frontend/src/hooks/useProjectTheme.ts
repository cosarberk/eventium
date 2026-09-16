/**
 * @fileoverview Active project theme — the CSS of the project's first `.et` file.
 *
 * A theme file holds CSS variable declarations; when a project has one, the Run
 * preview injects it (scoped) so the page reflects the theme. Returns the CSS
 * string (or null when the project has no theme file).
 */
import { useNodes } from '@/hooks/useNodes';

/** The active theme CSS for a project (its first `theme` node's content). */
export function useProjectTheme(projectId: string | undefined): string | null {
  const { nodes } = useNodes(projectId);
  const themeNode = nodes.find((n) => n.kind === 'theme');
  const content = themeNode?.data?.content;
  return typeof content === 'string' && content.trim() ? content : null;
}
