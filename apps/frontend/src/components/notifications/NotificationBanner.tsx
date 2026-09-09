/**
 * @fileoverview Full-width notification banner for critical events.
 * Displays a prominent dismissible banner at the top of the content area.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { SeverityIndicator } from '@/components/common/SeverityIndicator';
import type { EventItem } from '@/types';
import { timeAgo } from '@/utils/date';

interface NotificationBannerProps {
  event: EventItem;
  onDismiss: (id: string) => void;
}

/**
 * Renders a full-width, animated banner for high-priority event notifications.
 */
export function NotificationBanner({ event, onDismiss }: NotificationBannerProps) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDismiss(event.id), 200);
  }, [event.id, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-sm">
            <SeverityIndicator severity={event.severity} showLabel={false} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {event.title}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                {event.description}
              </p>
            </div>
            <span className="text-[10px] text-[var(--color-text-tertiary)] whitespace-nowrap">
              {timeAgo(event.createdAt)}
            </span>
            <button
              onClick={handleDismiss}
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              aria-label="Dismiss notification"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M9 3L3 9M3 3l6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
