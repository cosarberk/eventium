/**
 * @fileoverview React hook for design-layer page (dashboard) state.
 *
 * Combines the Zustand page store (in-progress block edits) with TanStack Query
 * (server sync). Components use this instead of touching the store/services
 * directly. The layer is block-based: `saveLayout` persists the active page's
 * blocks back to the backend.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDashboard,
  deleteDashboard,
  fetchDashboards,
  updateDashboard,
} from '@/services/dashboard.service';
import { useDashboardStore } from '@/storage/dashboard.store';
import type { DashboardBlock } from '@/types';

/** Query key factory for dashboard queries. */
const dashboardKeys = {
  all: ['dashboards'] as const,
  lists: () => [...dashboardKeys.all, 'list'] as const,
  details: () => [...dashboardKeys.all, 'detail'] as const,
  detail: (id: string) => [...dashboardKeys.details(), id] as const,
};

/**
 * Hook providing complete page management: server queries, mutations, and the
 * block-editing actions of the local store.
 * @returns Page state, queries, and mutation/edit functions.
 */
export function useDashboard() {
  const queryClient = useQueryClient();
  const store = useDashboardStore();

  const dashboardsQuery = useQuery({
    queryKey: dashboardKeys.lists(),
    queryFn: fetchDashboards,
  });

  const createMutation = useMutation({
    mutationFn: ({
      name,
      blocks,
      isDefault,
    }: {
      name: string;
      blocks?: DashboardBlock[];
      isDefault?: boolean;
    }) => createDashboard(name, blocks, isDefault),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { name?: string; blocks?: DashboardBlock[]; isDefault?: boolean };
    }) => updateDashboard(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDashboard(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.lists() });
    },
  });

  /** Persists the active page's current block layout/content to the server. */
  const saveLayout = () => {
    if (!store.activeDashboard) return;
    updateMutation.mutate({
      id: store.activeDashboard.id,
      input: { blocks: store.activeDashboard.blocks },
    });
  };

  return {
    dashboards: dashboardsQuery.data ?? [],
    activeDashboard: store.activeDashboard,
    isEditMode: store.isEditMode,
    isLoading: dashboardsQuery.isLoading,
    error: dashboardsQuery.error,

    setActiveDashboard: store.setActiveDashboard,
    setDashboards: store.setDashboards,
    addBlock: store.addBlock,
    removeBlock: store.removeBlock,
    updateBlockLayout: store.updateBlockLayout,
    updateBlockTitle: store.updateBlockTitle,
    updateBlockSlots: store.updateBlockSlots,
    updateBlockOptions: store.updateBlockOptions,
    toggleEditMode: store.toggleEditMode,
    setEditMode: store.setEditMode,

    createDashboard: createMutation.mutate,
    updateDashboard: updateMutation.mutate,
    deleteDashboard: deleteMutation.mutate,
    saveLayout,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
