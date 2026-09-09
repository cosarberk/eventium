/**
 * @fileoverview React hook for broadcast link CRUD operations.
 * Combines TanStack Query for server state with the broadcast service layer.
 * Components should use this hook instead of calling services directly.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBroadcastLink,
  deleteBroadcastLink,
  fetchBroadcastLinks,
  regenerateBroadcastLinkToken,
  updateBroadcastLink,
} from '@/services/broadcast.service';
import type { ID } from '@/types';

/** Query key factory for broadcast link queries */
const broadcastKeys = {
  all: ['broadcastLinks'] as const,
  lists: () => [...broadcastKeys.all, 'list'] as const,
};

/**
 * Hook providing complete broadcast link management capabilities.
 * Handles fetching, creating, updating, deleting, and token regeneration.
 * @returns Broadcast link state, queries, and mutation functions
 */
export function useBroadcastLinks() {
  const queryClient = useQueryClient();

  const linksQuery = useQuery({
    queryKey: broadcastKeys.lists(),
    queryFn: fetchBroadcastLinks,
  });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; dashboardIds: ID[]; rotationInterval?: number }) =>
      createBroadcastLink(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: broadcastKeys.lists() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: ID;
      input: {
        name?: string;
        enabled?: boolean;
        dashboardIds?: ID[];
        rotationInterval?: number;
      };
    }) => updateBroadcastLink(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: broadcastKeys.lists() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: ID) => deleteBroadcastLink(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: broadcastKeys.lists() });
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: (id: ID) => regenerateBroadcastLinkToken(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: broadcastKeys.lists() });
    },
  });

  return {
    links: linksQuery.data ?? [],
    isLoading: linksQuery.isLoading,
    error: linksQuery.error,

    createLink: createMutation.mutateAsync,
    updateLink: updateMutation.mutateAsync,
    deleteLink: deleteMutation.mutateAsync,
    regenerateToken: regenerateTokenMutation.mutateAsync,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRegenerating: regenerateTokenMutation.isPending,
  };
}
