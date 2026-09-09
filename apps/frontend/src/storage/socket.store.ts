/**
 * @fileoverview Zustand store for Socket.io connection state management.
 * Tracks connection status and the most recent event received via WebSocket.
 */
import { create } from 'zustand';
import type { ConnectionStatus, EventItem } from '@/types';

/** Shape of the socket store state and actions */
interface SocketState {
  /** Current WebSocket connection status */
  status: ConnectionStatus;
  /** The most recently received real-time event */
  lastEvent: EventItem | null;
  /** Timestamp of the last successful connection */
  connectedAt: string | null;
  /** Number of reconnection attempts made */
  reconnectAttempts: number;

  /** Updates the connection status */
  setStatus: (status: ConnectionStatus) => void;
  /** Sets the last received event */
  setLastEvent: (event: EventItem) => void;
  /** Records a successful connection */
  setConnected: () => void;
  /** Records a disconnection */
  setDisconnected: () => void;
  /** Increments the reconnection attempt counter */
  incrementReconnectAttempts: () => void;
  /** Resets reconnection attempt counter */
  resetReconnectAttempts: () => void;
}

/** Socket connection state store */
export const useSocketStore = create<SocketState>()((set, get) => ({
  status: 'disconnected',
  lastEvent: null,
  connectedAt: null,
  reconnectAttempts: 0,

  setStatus: (status) => {
    set({ status });
  },

  setLastEvent: (event) => {
    set({ lastEvent: event });
  },

  setConnected: () => {
    set({
      status: 'connected',
      connectedAt: new Date().toISOString(),
      reconnectAttempts: 0,
    });
  },

  setDisconnected: () => {
    set({ status: 'disconnected' });
  },

  incrementReconnectAttempts: () => {
    set({ reconnectAttempts: get().reconnectAttempts + 1 });
  },

  resetReconnectAttempts: () => {
    set({ reconnectAttempts: 0 });
  },
}));
