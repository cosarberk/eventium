/**
 * @fileoverview Empty state placeholder component.
 * Displayed when a data list has no items to show.
 */

interface EmptyStateProps {
  /** Primary message to display */
  title: string;
  /** Optional secondary description text */
  description?: string;
  /** Optional icon element rendered above the title */
  icon?: React.ReactNode;
  /** Optional action button or element */
  action?: React.ReactNode;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Renders a centered empty state with icon, title, description, and optional action.
 * @param props - Empty state configuration
 * @returns Empty state element
 */
export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {icon && <div className="mb-4 text-[var(--color-text-tertiary)]">{icon}</div>}
      <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-[var(--color-text-tertiary)] max-w-[280px]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
