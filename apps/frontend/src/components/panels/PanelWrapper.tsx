/**
 * @fileoverview Canvas panel container.
 *
 * In view mode a block shows a slim title bar + body. In *edit* mode the heavy
 * chrome is gone: the component renders as itself and a minimal floating toolbar
 * (title chip + code/config/remove) appears on hover or selection — the
 * Visual-Studio/Figma feel. Double-clicking a component opens its code/logic
 * editor. The title chip doubles as the drag handle in grid mode; in free mode
 * the whole card drags.
 */

/** CSS class react-grid-layout targets as the drag handle. */
export const DRAG_HANDLE_CLASS = 'eventium-drag-handle';

interface PanelWrapperProps {
  /** Panel title displayed in the header / title chip. */
  title: string;
  /** Whether the panel is in edit mode (minimal chrome + toolbar). */
  editing?: boolean;
  /** Optional action elements rendered in the panel header (view mode). */
  headerActions?: React.ReactNode;
  /** Panel content. */
  children: React.ReactNode;
  /** Callback when the remove button is clicked. */
  onRemove?: () => void;
  /** Callback when the configure button is clicked. */
  onConfigure?: () => void;
  /** Opens this component's code/logic editor (toolbar button + double-click). */
  onOpenEditor?: () => void;
  /** Whether this panel is currently selected (builder). */
  selected?: boolean;
  /** Called when the panel is clicked to select it (builder). */
  onSelect?: () => void;
  /** Free-canvas mode: the whole card drags, so hide the grip + show move cursor. */
  freeDrag?: boolean;
  /** Additional CSS class names. */
  className?: string;
}

/** A small square icon button for the floating edit toolbar. */
function ToolButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={label}
      title={label}
      className={`eventium-no-drag flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-bg-elevated)]/90 text-[var(--color-text-tertiary)] shadow-sm backdrop-blur transition-colors hover:text-[var(--color-text-primary)] ${
        danger ? 'hover:text-red-500' : 'hover:text-brand-500'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Renders a block on the canvas. Minimal chrome in edit mode; slim header in
 * view mode.
 */
export function PanelWrapper({
  title,
  editing = false,
  onRemove,
  onConfigure,
  onOpenEditor,
  headerActions,
  children,
  selected = false,
  onSelect,
  freeDrag = false,
  className = '',
}: PanelWrapperProps) {
  // ── Edit mode: component renders as itself, chrome floats on hover/select ──
  if (editing) {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: canvas selection; keyboard access via inspector
      // biome-ignore lint/a11y/useKeyWithClickEvents: canvas selection; keyboard access via inspector
      <div
        onClick={onSelect}
        onDoubleClick={onOpenEditor}
        className={`group relative flex h-full flex-col overflow-hidden rounded-lg bg-[var(--color-bg-elevated)] border transition-all ${
          selected
            ? 'border-brand-500 ring-2 ring-brand-500/50'
            : 'border-[var(--color-border-primary)] hover:border-brand-500/40'
        } ${freeDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
      >
        {/* Component itself fills the card */}
        <div className="min-h-0 flex-1 overflow-auto text-[var(--color-text-primary)]">
          {children}
        </div>

        {/* Title chip — top-left; doubles as the drag handle in grid mode */}
        <span
          className={`${freeDrag ? '' : `${DRAG_HANDLE_CLASS} cursor-grab active:cursor-grabbing`} pointer-events-auto absolute left-1.5 top-1.5 max-w-[70%] truncate rounded-md bg-[var(--color-bg-elevated)]/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100 ${
            selected ? 'opacity-100' : ''
          }`}
        >
          {title || 'panel'}
        </span>

        {/* Floating toolbar — top-right */}
        <div
          className={`absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${
            selected ? 'opacity-100' : ''
          }`}
        >
          {onOpenEditor && (
            <ToolButton label="Kod / Blueprint (çift tık)" onClick={onOpenEditor}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M5 4L2 7l3 3M9 4l3 3-3 3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </ToolButton>
          )}
          {onConfigure && (
            <ToolButton label="Ayarlar" onClick={onConfigure}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2" />
                <path
                  d="M11.3 8.3l.9.5-1 1.7-1-.3a3.8 3.8 0 01-.9.5l-.2 1H7l-.2-1a3.8 3.8 0 01-.9-.5l-1 .3-1-1.7.9-.5a3.8 3.8 0 010-1L2.9 6l1-1.7 1 .3a3.8 3.8 0 01.9-.5l.2-1h2l.2 1c.3.1.6.3.9.5l1-.3 1 1.7-.9.5a3.8 3.8 0 010 1z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </ToolButton>
          )}
          {onRemove && (
            <ToolButton label="Sil" danger onClick={onRemove}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M9 3L3 9M3 3l6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </ToolButton>
          )}
        </div>
      </div>
    );
  }

  // ── View mode: slim title bar + body ──
  return (
    <div
      className={`flex flex-col h-full rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-sm overflow-hidden ${className}`}
    >
      {(title || headerActions) && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border-primary)] shrink-0">
          <h3 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider flex-1 truncate">
            {title}
          </h3>
          {headerActions && <div className="flex items-center gap-1">{headerActions}</div>}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto text-[var(--color-text-primary)]">
        {children}
      </div>
    </div>
  );
}
