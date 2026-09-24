/**
 * @fileoverview React hook for project state (server sync via TanStack Query).
 *
 * Projects are the top-level unit the start screen lists and the editor opens.
 * Page/block editing still uses {@link ./useDashboard}; this hook manages project
 * roots and page membership.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPage,
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
} from '@/services/project.service';

/** Query key factory for project queries. */
const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
};

/** Provides the project list plus create/update/delete/add-page mutations. */
export function useProjects() {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: projectKeys.lists(),
    queryFn: fetchProjects,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
  };

  const createProjectMutation = useMutation({ mutationFn: createProject, onSuccess: invalidate });
  const deleteProjectMutation = useMutation({ mutationFn: deleteProject, onSuccess: invalidate });
  const updateProjectMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { name?: string; type?: string; description?: string };
    }) => updateProject(id, input),
    onSuccess: invalidate,
  });
  const createPageMutation = useMutation({
    mutationFn: ({ projectId, name }: { projectId: string; name: string }) =>
      createPage(projectId, name),
    onSuccess: invalidate,
  });

  return {
    projects: projectsQuery.data ?? [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    refetchProjects: () => queryClient.refetchQueries({ queryKey: projectKeys.lists() }),

    createProject: createProjectMutation.mutateAsync,
    deleteProject: deleteProjectMutation.mutateAsync,
    updateProject: updateProjectMutation.mutate,
    createPage: createPageMutation.mutateAsync,

    isCreating: createProjectMutation.isPending,
  };
}
