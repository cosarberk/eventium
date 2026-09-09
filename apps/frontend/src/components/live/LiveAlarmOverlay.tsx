/**
 * @fileoverview Hospital-style full-screen alarm overlay for live/TV views.
 *
 * When an announcement-worthy event arrives (a release/publish/deploy, or a
 * failure/critical), this overlay takes over the screen with a pulsing flash,
 * a repeated siren tone, and a large headline like
 * "X published with version Y". Announcements queue and play one at a time,
 * each auto-dismissing after a fixed duration.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEventSubscription } from '@/hooks/useSocket';
import type { EventItem } from '@/types';
import { type Announcement, getAnnouncement } from '@/utils/announce';
import { playNotificationSound } from '@/utils/sound';

/** How long a single announcement stays on screen (ms). */
const ALARM_DURATION = 9000;
/** Interval between siren tone repeats (ms). */
const SIREN_INTERVAL = 1400;
/** Maximum queued announcements to avoid unbounded growth. */
const MAX_QUEUE = 6;

/** Tone-specific presentation. */
const TONE_CONFIG = {
  alert: {
    flash: 'rgba(220, 38, 38, 0.32)',
    ring: 'ring-red-500/60',
    accent: 'text-red-400',
    chip: 'bg-red-500 text-white',
    label: 'ALERT',
    sound: 'critical' as const,
    icon: (
      <path
        d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  success: {
    flash: 'rgba(16, 185, 129, 0.30)',
    ring: 'ring-emerald-500/60',
    accent: 'text-emerald-400',
    chip: 'bg-emerald-500 text-white',
    label: 'PUBLISHED',
    sound: 'high' as const,
    icon: (
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
};

/**
 * Renders the live announcement alarm overlay.
 * Mount once inside a live/TV view; it manages its own queue and timers.
 */
export function LiveAlarmOverlay() {
  const [queue, setQueue] = useState<Announcement[]>([]);
  const current = queue[0] ?? null;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sirenTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Enqueue announcement-worthy events. */
  const handleEvent = useCallback((event: EventItem) => {
    const announcement = getAnnouncement(event);
    if (!announcement) return;
    setQueue((prev) => {
      if (prev.some((a) => a.eventId === announcement.eventId)) return prev;
      return [...prev, announcement].slice(-MAX_QUEUE);
    });
  }, []);

  useEventSubscription(handleEvent);

  /** Drive sound + auto-dismiss for the currently shown announcement. */
  useEffect(() => {
    if (!current) return;

    const profile = TONE_CONFIG[current.tone].sound;
    playNotificationSound(profile, 0.55);
    sirenTimer.current = setInterval(() => playNotificationSound(profile, 0.5), SIREN_INTERVAL);

    dismissTimer.current = setTimeout(() => {
      setQueue((prev) => prev.slice(1));
    }, ALARM_DURATION);

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (sirenTimer.current) clearInterval(sirenTimer.current);
    };
  }, [current]);

  /** Allow manual dismissal via Escape or click. */
  const dismiss = useCallback(() => setQueue((prev) => prev.slice(1)), []);
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, dismiss]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.eventId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
          onClick={dismiss}
        >
          {/* Pulsing flash backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: TONE_CONFIG[current.tone].flash }}
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Announcement card */}
          <motion.div
            initial={{ scale: 0.85, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className={`relative mx-6 max-w-3xl w-full rounded-3xl bg-black/70 border border-white/10 ring-4 ${TONE_CONFIG[current.tone].ring} shadow-2xl px-10 py-9 text-center`}
          >
            {/* Pulsing icon */}
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
              className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 ${TONE_CONFIG[current.tone].accent}`}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {TONE_CONFIG[current.tone].icon}
              </svg>
            </motion.div>

            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-bold tracking-[0.2em] ${TONE_CONFIG[current.tone].chip}`}
            >
              {TONE_CONFIG[current.tone].label}
            </span>

            <h1 className="mt-4 text-4xl font-extrabold text-white leading-tight">
              {current.headline}
            </h1>

            {current.version && (
              <div
                className={`mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-1.5 font-mono text-2xl font-bold ${TONE_CONFIG[current.tone].accent}`}
              >
                {current.version}
              </div>
            )}

            <p className="mt-4 text-lg text-white/70">{current.message}</p>

            <div className="mt-6 flex items-center justify-center gap-3 text-sm text-white/40">
              <span className="font-semibold uppercase tracking-wider">{current.source}</span>
              <span>·</span>
              <span className="font-mono tabular-nums">
                {new Date(current.timestamp).toLocaleTimeString('en-GB')}
              </span>
            </div>

            {queue.length > 1 && (
              <div className="mt-4 text-xs text-white/30">
                +{queue.length - 1} more announcement{queue.length - 1 > 1 ? 's' : ''} queued
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
