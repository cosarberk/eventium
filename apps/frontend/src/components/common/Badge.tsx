/**
 * @fileoverview Badge component for displaying labels and counts.
 * Supports multiple visual variants for different contexts.
 */

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  /** Text content of the badge */
  children: React.ReactNode;
  /** Visual style variant */
  variant?: BadgeVariant;
  /** Whether to render as a small dot-style indicator */
  dot?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/** Tailwind class mappings for each badge variant */
const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  neutral: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
};

/**
 * Renders a badge/chip component for labels, counts, and status indicators.
 * @param props - Badge configuration
 * @returns Badge element
 */
export function Badge({ children, variant = 'default', dot = false, className = '' }: BadgeProps) {
  if (dot) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${VARIANT_CLASSES[variant]} ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium leading-4 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
