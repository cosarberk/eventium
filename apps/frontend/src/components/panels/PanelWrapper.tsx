/**
 * @fileoverview Generic panel container for the dashboard builder and grid.
 * Renders a consistent header (drag handle, title, actions) and a scrollable
 * content area. Designed to be placed inside a react-grid-layout cell: the
 * drag handle carries the `eventium-drag-handle` class that the grid uses as
 * its `draggableHandle`, so panel content stays interactive.
 */

/** CSS class react-grid-layout targets as the drag handle. */
export const DRAG_HANDLE_CLASS = 'eventium-drag-handle';

interface PanelWrapperProps {
  /** Panel title displayed in the header. */
  title: string;
  /** Whether the panel is in edit mode (shows drag handle + remove/configure). */
  editing?: boolean;
  /** Optional action elements rendered in the panel header. */
  headerActions?: React.ReactNode;
  /** Panel content. */
  children: React.ReactNode;
  /** Callback when the remove button is clicked. */
  onRemove?: () => void;
  /** Callback when the configure button is clicked. */
  onConfigure?: () => void;
  /** Additional CSS class names. */
  className?: string;
}

/** Six-dot drag handle icon. */
function DragHandleIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="5" cy="3" r="1" fill="currentColor" />
      <circle cx="9" cy="3" r="1" fill="currentColor" />
      <circle cx="5" cy="7" r="1" fill="currentColor" />
      <circle cx="9" cy="7" r="1" fill="currentColor" />
      <circle cx="5" cy="11" r="1" fill="currentColor" />
      <circle cx="9" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Renders a panel container with header, optional drag handle, and content.
 * @param props - Panel wrapper configuration
 * @returns Panel wrapper element
 */
export function PanelWrapper({
  title,
  editing = false,
  onRemove,
  onConfigure,
  headerActions,
  children,
  className = '',
}: PanelWrapperProps) {
  return (
    <div
      className={`flex flex-col h-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border-primary)] shrink-0">
        {editing && (
          <span
            className={`${DRAG_HANDLE_CLASS} shrink-0 cursor-grab active:cursor-grabbing text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors`}
            aria-label="Drag to move"
          >
            <DragHandleIcon />
          </span>
        )}
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider flex-1 truncate">
          {title}
        </h3>
        {headerActions && <div className="flex items-center gap-1">{headerActions}</div>}
        {editing && onConfigure && (
          <button
            type="button"
            onClick={onConfigure}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-brand-500 transition-colors"
            aria-label="Configure panel"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2" />
              <path
                d="M11.3 8.3l.9.5-1 1.7-1-.3a3.8 3.8 0 01-.9.5l-.2 1H7l-.2-1a3.8 3.8 0 01-.9-.5l-1 .3-1-1.7.9-.5a3.8 3.8 0 010-1L2.9 6l1-1.7 1 .3a3.8 3.8 0 01.9-.5l.2-1h2l.2 1c.3.1.6.3.9.5l1-.3 1 1.7-.9.5a3.8 3.8 0 010 1z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        {editing && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-red-500 transition-colors"
            aria-label="Remove panel"
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
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto text-[var(--color-text-primary)]">
        {children}
      </div>
    </div>
  );
}
