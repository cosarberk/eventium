/**
 * @fileoverview React hook for theme management.
 * Provides a simple interface for reading and toggling the theme mode.
 * Components should use this hook instead of accessing the theme store directly.
 */
import { useThemeStore } from '@/storage/theme.store';
import type { ThemeMode } from '@/types';

/**
 * Hook for reading and controlling the application theme.
 * @returns Theme state and toggle functions
 */
export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const setMode = useThemeStore((s) => s.setMode);

  return {
    /** Current theme mode */
    mode,
    /** Whether dark mode is active */
    isDark: mode === 'dark',
    /** Whether light mode is active */
    isLight: mode === 'light',
    /** Toggles between light and dark mode */
    toggle,
    /** Sets a specific theme mode */
    setMode: setMode as (mode: ThemeMode) => void,
  };
}
