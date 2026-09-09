/**
 * @fileoverview Service layer for Socket.io connection management.
 * Manages WebSocket lifecycle, event listeners, and reconnection logic.
 *
 * The server authenticates every handshake. A signed-in browser is identified by
 * its session cookie; the public TV view has no session and presents the active
 * broadcast token instead, which limits it to that broadcast's own sources.
 */
import { socket } from '@/api/client';
import { getBroadcastToken } from '@/storage/broadcast.store';
import { useNotificationStore } from '@/storage/notification.store';
import { useSocketStore } from '@/storage/socket.store';
import type { EventItem } from '@/types';

/** Callback type for event handlers */
type EventHandler = (event: EventItem) => void;

/** Registry of event listeners for cleanup */
const eventListeners = new Set<EventHandler>();

/**
 * Initializes the Socket.io connection and registers core event handlers.
 * Should be called once during application bootstrap.
 */
export function initializeSocket(): void {
  useSocketStore.getState().setStatus('connecting');

  // Set before connecting so the value is also replayed on every reconnect.
  const broadcastToken = getBroadcastToken();
  socket.auth = broadcastToken ? { broadcastToken } : {};

  socket.on('connect', () => {
    useSocketStore.getState().setConnected();
  });

  socket.on('disconnect', () => {
    useSocketStore.getState().setDisconnected();
  });

  socket.on('connect_error', () => {
    useSocketStore.getState().setStatus('error');
    useSocketStore.getState().incrementReconnectAttempts();
  });

  socket.on('reconnect_attempt', () => {
    useSocketStore.getState().setStatus('connecting');
    useSocketStore.getState().incrementReconnectAttempts();
  });

  socket.on('reconnect', () => {
    useSocketStore.getState().setConnected();
  });

  socket.on('event:new', (event: EventItem) => {
    useSocketStore.getState().setLastEvent(event);
    useNotificationStore.getState().addFromEvent(event);
    eventListeners.forEach((handler) => {
      handler(event);
    });
  });

  socket.connect();
}

/**
 * Disconnects the Socket.io client and cleans up all event handlers.
 */
export function disconnectSocket(): void {
  socket.off('connect');
  socket.off('disconnect');
  socket.off('connect_error');
  socket.off('reconnect_attempt');
  socket.off('reconnect');
  socket.off('event:new');
  eventListeners.clear();
  socket.disconnect();
  useSocketStore.getState().setDisconnected();
}

/**
 * Registers a handler to be called whenever a new event arrives via WebSocket.
 * @param handler - Callback function receiving the new event
 * @returns Cleanup function to unregister the handler
 */
export function onNewEvent(handler: EventHandler): () => void {
  eventListeners.add(handler);
  return () => {
    eventListeners.delete(handler);
  };
}

/**
 * Subscribes to events for a specific plugin instance channel.
 * @param pluginInstanceId - The plugin instance ID to subscribe to
 */
export function subscribeToPlugin(pluginInstanceId: string): void {
  socket.emit('subscribe', { pluginInstanceId });
}

/**
 * Unsubscribes from events for a specific plugin instance channel.
 * @param pluginInstanceId - The plugin instance ID to unsubscribe from
 */
export function unsubscribeFromPlugin(pluginInstanceId: string): void {
  socket.emit('unsubscribe', { pluginInstanceId });
}
