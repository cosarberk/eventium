/**
 * @fileoverview Zustand store holding the active public broadcast token.
 *
 * The TV view runs without a session, so every request it makes must carry the
 * broadcast token instead: binding resolution is scoped to that broadcast's own
 * blocks, and the WebSocket handshake uses it to authorise the display. Keeping
 * it here avoids threading the token through the whole block-rendering tree.
 */
import { create } from 'zustand';

/** Shape of the broadcast session store. */
interface BroadcastSessionState {
  /** The token of the broadcast currently being displayed, if any. */
  token: string | null;
  /** Record (or clear) the active broadcast token. */
  setToken: (token: string | null) => void;
}

/** Broadcast session store (not persisted — it comes from the URL). */
export const useBroadcastSessionStore = create<BroadcastSessionState>()((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));

/**
 * Read the active broadcast token outside React (services, socket setup).
 *
 * @returns The token, or `null` when the app is running as a signed-in user.
 */
export function getBroadcastToken(): string | null {
  return useBroadcastSessionStore.getState().token;
}
