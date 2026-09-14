/**
 * @fileoverview Active canvas tool — Photoshop-style tool model.
 *
 * The active tool governs the pointer on the canvas: `select` selects/moves and
 * marquees, `hand` pans, `zoom` zooms at the click point. Kept in a tiny store so
 * the tool strip, the options bar and the canvas all share one source of truth.
 */
import { create } from 'zustand';

/** Canvas tools. */
export type Tool = 'select' | 'hand' | 'zoom';

/** Tool metadata for the tool strip. */
export interface ToolDef {
  id: Tool;
  label: string;
  shortcut: string;
  /** Single-key shortcut (lowercase) that activates the tool. */
  key: string;
  /** Inline SVG path(s) for the icon (drawn in a 16-box). */
  icon: string;
  cursor: string;
}

export const TOOLS: ToolDef[] = [
  {
    id: 'select',
    label: 'Seç / Taşı',
    shortcut: 'V',
    key: 'v',
    icon: 'M3 2l10 5-4 1.5L7.5 13 3 2z',
    cursor: 'default',
  },
  {
    id: 'hand',
    label: 'El (kaydır)',
    shortcut: 'H',
    key: 'h',
    icon: 'M5 8V4a1 1 0 012 0v3m0 0V3a1 1 0 012 0v4m0 0V4a1 1 0 012 0v5c0 3-2 5-4.5 5S6 13 5 11l-1.5-2a1 1 0 011.5-1.3L6 9',
    cursor: 'grab',
  },
  {
    id: 'zoom',
    label: 'Yakınlaştır',
    shortcut: 'Z',
    key: 'z',
    icon: 'M7 2a5 5 0 104 8l3 3M5 7h4M7 5v4',
    cursor: 'zoom-in',
  },
];

interface ToolState {
  tool: Tool;
  setTool: (tool: Tool) => void;
}

/** Active-tool store. */
export const useToolStore = create<ToolState>((set) => ({
  tool: 'select',
  setTool: (tool) => set({ tool }),
}));
