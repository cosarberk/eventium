/**
 * @fileoverview React hook for a project's file-system tree (server sync).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createNode,
  deleteNode,
  duplicateNode,
  fetchNodes,
  moveNode,
  renameNode,
} from '@/services/node.service';

const nodeKeys = {
  all: ['nodes'] as const,
  list: (projectId: string) => [...nodeKeys.all, projectId] as const,
};

/** Tree state + create/rename/move/delete for a project. */
export function useNodes(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const nodesQuery = useQuery({
    queryKey: nodeKeys.list(projectId ?? ''),
    queryFn: () => fetchNodes(projectId as string),
    enabled: Boolean(projectId),
  });

  const invalidate = () => {
    if (projectId) void queryClient.invalidateQueries({ queryKey: nodeKeys.list(projectId) });
  };

  const createMutation = useMutation({ mutationFn: createNode, onSuccess: invalidate });
  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameNode(id, name),
    onSuccess: invalidate,
  });
  const moveMutation = useMutation({
    mutationFn: ({ id, parentId, order }: { id: string; parentId: string | null; order: number }) =>
      moveNode(id, parentId, order),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({ mutationFn: deleteNode, onSuccess: invalidate });
  const duplicateMutation = useMutation({ mutationFn: duplicateNode, onSuccess: invalidate });

  return {
    nodes: nodesQuery.data ?? [],
    isLoading: nodesQuery.isLoading,
    refetch: () =>
      projectId ? queryClient.refetchQueries({ queryKey: nodeKeys.list(projectId) }) : undefined,

    createNode: createMutation.mutateAsync,
    renameNode: renameMutation.mutateAsync,
    moveNode: moveMutation.mutateAsync,
    deleteNode: deleteMutation.mutateAsync,
    duplicateNode: duplicateMutation.mutateAsync,
  };
}
