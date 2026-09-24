/**
 * @fileoverview Drawer primitive — a side panel that OVERLAYS content (never
 * squeezes it). Slides from an edge, dims + closes on backdrop/Escape, and is
 * full-responsive (full-width on phones, fixed max width on md+).
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

/** Drawer props. */
export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Max width on md+ (Tailwind class). Default 'md:max-w-md'. */
  widthClass?: string;
}

/** Overlay drawer. Renders nothing when closed. */
export function Drawer({
  open,
  onClose,
  side = 'right',
  title,
  footer,
  children,
  widthClass = 'md:max-w-md',
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const fromX = side === 'right' ? '100%' : '-100%';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90]">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.aside
            className={`absolute top-0 bottom-0 ${side === 'right' ? 'right-0' : 'left-0'} w-full ${widthClass} flex flex-col bg-[var(--color-bg-elevated)] ${
              side === 'right' ? 'border-l' : 'border-r'
            } border-[var(--color-border-primary)] shadow-xl`}
            initial={{ x: fromX }}
            animate={{ x: 0 }}
            exit={{ x: fromX }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            {title !== undefined && (
              <div className="flex items-center justify-between gap-3 px-4 h-header border-b border-[var(--color-border-primary)] shrink-0">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
            {footer && (
              <div className="px-4 py-3 border-t border-[var(--color-border-primary)] shrink-0">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
