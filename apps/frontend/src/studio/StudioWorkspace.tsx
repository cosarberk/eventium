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
import { toast } from 'sonner';
import { useNodes } from '@/hooks/useNodes';
import { useSeedPageVariables } from '@/hooks/usePageVariables';
import { fetchProjects } from '@/services/project.service';
import { useDashboardStore } from '@/storage/dashboard.store';
import { StartScreen } from './StartScreen';
import { StudioDock } from './StudioDock';
// Side-effect: ensure design components are registered before the canvas mounts.
import '@/components/design/components';

/** The authenticated workspace surface. */
export function StudioWorkspace() {
  const projectOpen = useDashboardStore((s) => s.projectOpen);
  const activeProject = useDashboardStore((s) => s.activeProject);
  const activeDashboard = useDashboardStore((s) => s.activeDashboard);

  /** Seed the open page's persisted runtime variables. */
  useSeedPageVariables(activeDashboard?.id, activeDashboard?.layout);

  // Start screen only when no project is open at all.
  if (!projectOpen || !activeProject) {
    return <StartScreen />;
  }

  // Project open but no page (e.g. the last page was deleted): stay in the
  // project with a friendly empty state, don't bounce to the start screen.
  if (!activeDashboard) {
    return <EmptyProject />;
  }

  return <StudioDock />;
}

/** Shown when a project is open but has no pages. */
function EmptyProject() {
  const activeProject = useDashboardStore((s) => s.activeProject);
  const addPage = useDashboardStore((s) => s.addPage);
  const closeProject = useDashboardStore((s) => s.closeProject);
  const { createNode } = useNodes(activeProject?.id);

  const newPage = async () => {
    if (!activeProject) return;
    try {
      const node = await createNode({ projectId: activeProject.id, kind: 'page', name: 'Sayfa 1' });
      const projects = await fetchProjects();
      const page = projects
        .find((p) => p.id === activeProject.id)
        ?.pages.find((p) => p.id === node.refId);
      if (page) addPage(page);
    } catch (e) {
      toast.error(`Sayfa oluşturulamadı: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[var(--color-bg-primary)] text-center">
      <span className="text-4xl opacity-60">📄</span>
      <div>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          {activeProject?.name}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
          Bu projede henüz sayfa yok.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void newPage()}
          className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Yeni sayfa
        </button>
        <button
          type="button"
          onClick={closeProject}
          className="rounded-lg border border-[var(--color-border-primary)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          Başlangıç ekranı
        </button>
      </div>
    </div>
  );
}
