/**
 * @fileoverview Real-time event feed panel.
 * Displays a scrolling list of monitoring events with severity indicators.
 */

import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SeverityIndicator } from '@/components/common/SeverityIndicator';
import { useEvents } from '@/hooks/useEvents';
import { useEventSubscription } from '@/hooks/useSocket';
import type { EventItem } from '@/types';
import { timeAgo } from '@/utils/date';

interface EventFeedProps {
  /** When set, only events from this plugin instance are shown. */
  pluginInstanceId?: string;
  /** Maximum number of events to fetch. */
  limit?: number;
}

/**
 * Renders a real-time scrolling event feed.
 * Subscribes to new events via WebSocket and prepends them to the list.
 * @param props - Optional plugin-instance filter and fetch limit
 */
export function EventFeed({ pluginInstanceId, limit = 50 }: EventFeedProps = {}) {
  const { data, isLoading } = useEvents({ limit, pluginInstanceId });
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);

  const handleNewEvent = useCallback(
    (_event: EventItem) => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    [queryClient],
  );

  useEventSubscription(handleNewEvent);

  const events = data?.items ?? [];

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [events.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        title="No events yet"
        description="Events from your connected plugins will appear here in real-time."
        icon={
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M16 4v12l8 4M28 16a12 12 0 11-24 0 12 12 0 0124 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    );
  }

  return (
    <div
      ref={listRef}
      className="divide-y divide-[var(--color-border-primary)] max-h-[500px] overflow-y-auto"
    >
      <AnimatePresence initial={false}>
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 py-2.5 hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="pt-0.5 shrink-0">
                <SeverityIndicator severity={event.severity} showLabel={false} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-[var(--color-text-primary)] font-medium truncate">
                    {event.title}
                  </p>
                  <span className="text-[10px] text-[var(--color-text-tertiary)] whitespace-nowrap shrink-0">
                    {timeAgo(event.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 truncate">
                  {event.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[var(--color-text-tertiary)] font-medium">
                    {event.pluginInstance?.name ?? event.eventType}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
