/**
 * @fileoverview Notification center panel component.
 * Slide-out panel displaying notification history with read/dismiss controls.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { EmptyState } from '@/components/common/EmptyState';
import { SeverityIndicator } from '@/components/common/SeverityIndicator';
import { useNotifications } from '@/hooks/useNotifications';
import { timeAgo } from '@/utils/date';

/**
 * Renders a slide-out notification center panel on the right side of the viewport.
 */
export function NotificationCenter() {
  const { notifications, unreadCount, isOpen, setOpen, markRead, markAllRead, dismiss } =
    useNotifications();

  const activeNotifications = notifications.filter((n) => !n.dismissed);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-[var(--color-bg-overlay)]"
            onClick={() => setOpen(false)}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-[var(--color-bg-elevated)] border-l border-[var(--color-border-primary)] shadow-lg flex flex-col"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-border-primary)] shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-brand-500 text-white text-[10px] font-bold px-1.5">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="text-xs text-brand-500 hover:text-brand-600 font-medium px-2 py-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  aria-label="Close notification center"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeNotifications.length === 0 ? (
                <EmptyState
                  title="No notifications"
                  description="You're all caught up. New notifications will appear here in real-time."
                />
              ) : (
                <ul className="divide-y divide-[var(--color-border-primary)]">
                  {activeNotifications.map((notification) => (
                    <motion.li
                      key={notification.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`px-4 py-3 hover:bg-[var(--color-surface-hover)] transition-colors ${
                        !notification.read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <SeverityIndicator
                            severity={notification.event.severity}
                            showLabel={false}
                            size="sm"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-sm truncate ${
                                notification.read
                                  ? 'text-[var(--color-text-secondary)]'
                                  : 'text-[var(--color-text-primary)] font-medium'
                              }`}
                            >
                              {notification.event.title}
                            </p>
                            <span className="text-[10px] text-[var(--color-text-tertiary)] whitespace-nowrap shrink-0">
                              {timeAgo(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 line-clamp-2">
                            {notification.event.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {!notification.read && (
                              <button
                                onClick={() => markRead(notification.id)}
                                className="text-[10px] text-brand-500 hover:text-brand-600 font-medium"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={() => dismiss(notification.id)}
                              className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] font-medium"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
