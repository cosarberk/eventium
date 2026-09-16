/**
 * @fileoverview The studio workspace — the single full-viewport surface of the
 * authenticated app.
 *
 * There is no separate "home page" and no boxed editor: the app opens into this
 * workspace. With no project open it shows the {@link StartScreen} (project
 * browser); opening a project fills the whole workspace with the docking editor
 * ({@link StudioDock}), focused on the project's active page. One surface, one
 * flow — like a desktop IDE.
 */
import { useSeedPageVariables } from '@/hooks/usePageVariables';
import { useDashboardStore } from '@/storage/dashboard.store';
import { StartScreen } from './StartScreen';
import { StudioDock } from './StudioDock';
// Side-effect: ensure design components are registered before the canvas mounts.
import '@/components/design/components';

/** The authenticated workspace surface. */
export function StudioWorkspace() {
  const projectOpen = useDashboardStore((s) => s.projectOpen);
  const activeDashboard = useDashboardStore((s) => s.activeDashboard);

  /** Seed the open page's persisted runtime variables. */
  useSeedPageVariables(activeDashboard?.id, activeDashboard?.layout);

  if (!projectOpen || !activeDashboard) {
    return <StartScreen />;
  }

  return <StudioDock />;
}
