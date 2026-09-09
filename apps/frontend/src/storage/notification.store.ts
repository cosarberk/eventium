/**
 * @fileoverview Zustand store for client-side notification state.
 * Manages notification events received via WebSocket for display in the UI.
 */
import { create } from 'zustand';
import type { EventItem } from '@/types';

/** Shape of a client-side notification derived from events */
interface ClientNotification {
  id: string;
  event: EventItem;
  read: boolean;
  dismissed: boolean;
  timestamp: string;
}

/** Shape of the notification store state and actions */
interface NotificationState {
  /** List of active notifications */
  notifications: ClientNotification[];
  /** Count of unread notifications */
  unreadCount: number;
  /** Whether the notification center panel is open */
  isOpen: boolean;

  /** Adds a new notification from an event */
  addFromEvent: (event: EventItem) => void;
  /** Marks a specific notification as read */
  markRead: (id: string) => void;
  /** Marks all notifications as read */
  markAllRead: () => void;
  /** Dismisses a specific notification */
  dismiss: (id: string) => void;
  /** Clears all notifications */
  clearAll: () => void;
  /** Toggles the notification center panel */
  toggleOpen: () => void;
  /** Sets the notification center panel visibility */
  setOpen: (open: boolean) => void;
}

/**
 * Computes unread count from notification list.
 * @param notifications - The notification list
 * @returns Number of unread, non-dismissed notifications
 */
function computeUnread(notifications: ClientNotification[]): number {
  return notifications.filter((n) => !n.read && !n.dismissed).length;
}

/** Notification state store */
export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,

  addFromEvent: (event) => {
    const notification: ClientNotification = {
      id: `notif-${event.id}`,
      event,
      read: false,
      dismissed: false,
      timestamp: event.createdAt,
    };
    const updated = [notification, ...get().notifications];
    set({ notifications: updated, unreadCount: computeUnread(updated) });
  },

  markRead: (id) => {
    const updated = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    set({ notifications: updated, unreadCount: computeUnread(updated) });
  },

  markAllRead: () => {
    const updated = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: updated, unreadCount: 0 });
  },

  dismiss: (id) => {
    const updated = get().notifications.filter((n) => n.id !== id);
    set({ notifications: updated, unreadCount: computeUnread(updated) });
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  toggleOpen: () => {
    set({ isOpen: !get().isOpen });
  },

  setOpen: (open) => {
    set({ isOpen: open });
  },
}));
