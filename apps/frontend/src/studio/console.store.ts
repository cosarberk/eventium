/**
 * @fileoverview Console/output log store.
 *
 * A small ring buffer of runtime log entries shown in the Console tool window.
 * Captures window errors + unhandled rejections, and exposes {@link logConsole}
 * so any part of the app (e.g. binding resolution) can report to it.
 */
import { create } from 'zustand';

export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
  id: string;
  level: LogLevel;
  message: string;
  time: number;
}

const MAX = 300;

interface ConsoleState {
  entries: LogEntry[];
  push: (level: LogLevel, message: string) => void;
  clear: () => void;
}

/** Console log store. */
export const useConsoleStore = create<ConsoleState>((set) => ({
  entries: [],
  push: (level, message) =>
    set((s) => ({
      entries: [
        ...s.entries.slice(-(MAX - 1)),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          level,
          message,
          time: Date.now(),
        },
      ],
    })),
  clear: () => set({ entries: [] }),
}));

/** Report a message to the Console from anywhere (non-React safe). */
export function logConsole(level: LogLevel, message: string) {
  useConsoleStore.getState().push(level, message);
}

let installed = false;
/** Install global error capture once (window errors + promise rejections). */
export function installConsoleCapture() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => logConsole('error', e.message || 'Bilinmeyen hata'));
  window.addEventListener('unhandledrejection', (e) =>
    logConsole('error', `İşlenmeyen promise reddi: ${String((e as PromiseRejectionEvent).reason)}`),
  );
  // Errors postMessage'd from sandboxed custom-code panels.
  window.addEventListener('message', (e) => {
    const data = (e as MessageEvent).data as {
      __eventium_error?: { panel?: string; message?: string };
    };
    if (data && typeof data === 'object' && data.__eventium_error) {
      const { panel, message } = data.__eventium_error;
      logConsole('error', `[${panel ?? 'panel'}] ${message ?? 'hata'}`);
    }
  });
}
