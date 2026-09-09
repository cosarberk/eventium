/**
 * @fileoverview React hook for Socket.io connection management.
 * Provides connection lifecycle management and real-time event subscription.
 * Components should use this hook instead of calling socket services directly.
 */
import { useCallback, useEffect } from 'react';
import { disconnectSocket, initializeSocket, onNewEvent } from '@/services/socket.service';
import { useSocketStore } from '@/storage/socket.store';
import type { EventItem } from '@/types';

/**
 * Hook that manages the Socket.io connection lifecycle.
 * Connects on mount and disconnects on unmount.
 * Should be called once at the application root level.
 * @returns Socket connection state and control functions
 */
export function useSocket() {
  const status = useSocketStore((s) => s.status);
  const lastEvent = useSocketStore((s) => s.lastEvent);
  const connectedAt = useSocketStore((s) => s.connectedAt);
  const reconnectAttempts = useSocketStore((s) => s.reconnectAttempts);

  useEffect(() => {
    initializeSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  return {
    status,
    lastEvent,
    connectedAt,
    reconnectAttempts,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
  };
}

/**
 * Hook that subscribes to real-time events and calls the provided handler.
 * Automatically cleans up the subscription on unmount.
 * @param handler - Callback invoked with each new event
 */
export function useEventSubscription(handler: (event: EventItem) => void) {
  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    const unsubscribe = onNewEvent(stableHandler);
    return unsubscribe;
  }, [stableHandler]);
}
