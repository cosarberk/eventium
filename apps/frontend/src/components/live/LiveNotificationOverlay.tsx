/**
 * @fileoverview Notification overlay for live/broadcast views.
 * Displays brief event notifications as toast-like overlays.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { useEventSubscription } from '@/hooks/useSocket';
import type { EventItem, Severity } from '@/types';
import { getAnnouncement } from '@/utils/announce';

const MAX_VISIBLE = 3;
const DISMISS_DELAY = 6000;

const SEVERITY_OVERLAY_COLORS: Record<Severity, string> = {
  CRITICAL: 'bg-red-500',
  ERROR: 'bg-orange-500',
  WARNING: 'bg-amber-500',
  INFO: 'bg-blue-400',
};

interface OverlayItem {
  key: number;
  event: EventItem;
}

let overlayCounter = 0;

/**
 * Renders a floating notification overlay for the live/broadcast view.
 */
export function LiveNotificationOverlay() {
  const [items, setItems] = useState<OverlayItem[]>([]);

  const handleNewEvent = useCallback((event: EventItem) => {
    // Announcement-worthy events are owned by the full-screen alarm overlay;
    // here we surface only routine-but-notable warnings as corner toasts.
    if (getAnnouncement(event)) return;
    if (event.severity !== 'WARNING') return;

    const key = ++overlayCounter;
    setItems((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { key, event }]);

    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.key !== key));
    }, DISMISS_DELAY);
  }, []);

  useEventSubscription(handleNewEvent);

  useEffect(() => {
    return () => {
      setItems([]);
    };
  }, []);

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
      <AnimatePresence>
        {items.map(({ key, event }) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex items-start gap-3 px-4 py-3 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl"
          >
            <div
              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${SEVERITY_OVERLAY_COLORS[event.severity]}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{event.title}</p>
              <p className="text-xs text-white/50 truncate mt-0.5">
                {event.pluginInstance?.name ?? event.eventType}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
