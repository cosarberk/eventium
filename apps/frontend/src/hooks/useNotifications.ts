/**
 * @fileoverview React hook for notification management.
 * Combines Zustand store for client-side notifications with server-side
 * notification rules management.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createNotificationRule,
  deleteNotificationRule,
  fetchNotificationRules,
  updateNotificationRule,
} from '@/services/notification.service';
import { useNotificationStore } from '@/storage/notification.store';

/** Query key factory for notification queries */
const notificationKeys = {
  all: ['notifications'] as const,
  rules: () => [...notificationKeys.all, 'rules'] as const,
};

/**
 * Hook providing client-side notification state and actions.
 * Notifications come from WebSocket events, not from a server query.
 * @returns Notification state and action functions
 */
export function useNotifications() {
  const store = useNotificationStore();

  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    isOpen: store.isOpen,
    toggleOpen: store.toggleOpen,
    setOpen: store.setOpen,
    markRead: store.markRead,
    markAllRead: store.markAllRead,
    dismiss: store.dismiss,
    clearAll: store.clearAll,
  };
}

/**
 * Hook for managing server-side notification rules (settings page).
 * @returns Notification rules state and mutation functions
 */
export function useNotificationRules() {
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: notificationKeys.rules(),
    queryFn: fetchNotificationRules,
  });

  const createMutation = useMutation({
    mutationFn: createNotificationRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.rules() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateNotificationRule>[1];
    }) => updateNotificationRule(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.rules() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotificationRule(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.rules() });
    },
  });

  return {
    rules: rulesQuery.data ?? [],
    isLoading: rulesQuery.isLoading,
    createRule: createMutation.mutate,
    updateRule: updateMutation.mutate,
    deleteRule: deleteMutation.mutate,
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
}
