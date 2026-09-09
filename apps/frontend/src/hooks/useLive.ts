/**
 * @fileoverview React hook for live preview mode state management.
 * Manages dashboard rotation, cursor auto-hide, keyboard shortcuts,
 * and fullscreen toggle for the TV-optimized live view.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useLiveStore } from '@/storage/live.store';
import type { Dashboard } from '@/types';

/** Cursor auto-hide delay in milliseconds */
const CURSOR_HIDE_DELAY = 3000;

/**
 * Hook providing complete live mode capabilities.
 * Handles auto-rotation, keyboard navigation, cursor visibility, and fullscreen.
 * @param dashboards - Available dashboards to rotate through
 * @param options - Optional configuration overrides
 * @returns Live mode state and control functions
 */
export function useLive(dashboards: Dashboard[], options?: { overrideInterval?: number }) {
  const activeDashboardId = useLiveStore((s) => s.activeDashboardId);
  const rotationEnabled = useLiveStore((s) => s.rotationEnabled);
  const rotationInterval = useLiveStore((s) => s.rotationInterval);
  const cursorVisible = useLiveStore((s) => s.cursorVisible);
  const setActiveDashboardId = useLiveStore((s) => s.setActiveDashboardId);
  const toggleRotation = useLiveStore((s) => s.toggleRotation);
  const setCursorVisible = useLiveStore((s) => s.setCursorVisible);

  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveInterval = options?.overrideInterval ?? rotationInterval;

  /** The currently active dashboard object */
  const activeDashboard =
    dashboards.find((d) => d.id === activeDashboardId) ?? dashboards[0] ?? null;

  /** Sets the first dashboard as active if none is selected */
  useEffect(() => {
    const first = dashboards[0];
    if (first && !activeDashboardId) {
      setActiveDashboardId(first.id);
    }
  }, [dashboards, activeDashboardId, setActiveDashboardId]);

  /** Navigates to the next dashboard in the list */
  const goNext = useCallback(() => {
    if (dashboards.length <= 1) return;
    const currentIndex = dashboards.findIndex((d) => d.id === activeDashboardId);
    const nextIndex = (currentIndex + 1) % dashboards.length;
    const next = dashboards[nextIndex];
    if (next) setActiveDashboardId(next.id);
  }, [dashboards, activeDashboardId, setActiveDashboardId]);

  /** Navigates to the previous dashboard in the list */
  const goPrev = useCallback(() => {
    if (dashboards.length <= 1) return;
    const currentIndex = dashboards.findIndex((d) => d.id === activeDashboardId);
    const prevIndex = (currentIndex - 1 + dashboards.length) % dashboards.length;
    const prev = dashboards[prevIndex];
    if (prev) setActiveDashboardId(prev.id);
  }, [dashboards, activeDashboardId, setActiveDashboardId]);

  /** Toggles browser fullscreen mode */
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }, []);

  /** Auto-rotation timer */
  useEffect(() => {
    if (rotationTimerRef.current) {
      clearInterval(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }

    if (rotationEnabled && dashboards.length > 1) {
      rotationTimerRef.current = setInterval(goNext, effectiveInterval * 1000);
    }

    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
      }
    };
  }, [rotationEnabled, effectiveInterval, dashboards.length, goNext]);

  /** Cursor auto-hide on mouse inactivity */
  useEffect(() => {
    const handleMouseMove = () => {
      setCursorVisible(true);

      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }

      cursorTimeoutRef.current = setTimeout(() => {
        setCursorVisible(false);
      }, CURSOR_HIDE_DELAY);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [setCursorVisible]);

  /** Keyboard shortcuts: Escape, Left/Right, F, Space */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (document.fullscreenElement) {
            void document.exitFullscreen();
          } else {
            window.history.back();
          }
          break;
        case 'ArrowLeft':
          goPrev();
          break;
        case 'ArrowRight':
          goNext();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case ' ':
          e.preventDefault();
          toggleRotation();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, toggleFullscreen, toggleRotation]);

  return {
    activeDashboard,
    activeDashboardId,
    rotationEnabled,
    rotationInterval: effectiveInterval,
    cursorVisible,
    dashboards,

    setActiveDashboardId,
    toggleRotation,
    goNext,
    goPrev,
    toggleFullscreen,
  };
}
