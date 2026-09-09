/**
 * @fileoverview React hook for notification sound playback.
 * Wraps the sound utility with React lifecycle awareness.
 */
import { useCallback, useRef } from 'react';
import type { Severity } from '@/types';
import { playNotificationSound } from '@/utils/sound';

const THROTTLE_MS = 500;

/** Maps backend Severity enum to sound profile keys */
const SEVERITY_TO_SOUND: Record<Severity, 'critical' | 'high' | 'medium' | 'low' | 'info'> = {
  CRITICAL: 'critical',
  ERROR: 'high',
  WARNING: 'medium',
  INFO: 'info',
};

/**
 * Hook for playing notification sounds with built-in throttling.
 * @param volume - Volume level between 0 and 1 (defaults to 0.3)
 * @returns Function to play a notification sound for a given severity level
 */
export function useSound(volume = 0.3) {
  const lastPlayedRef = useRef(0);

  const play = useCallback(
    (severity: Severity = 'INFO') => {
      const now = Date.now();
      if (now - lastPlayedRef.current < THROTTLE_MS) return;
      lastPlayedRef.current = now;
      playNotificationSound(SEVERITY_TO_SOUND[severity], volume);
    },
    [volume],
  );

  return { play };
}
