/**
 * @fileoverview Animated loading spinner component.
 * Provides visual feedback during data fetching operations.
 */
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  /** Size of the spinner in pixels (defaults to 32) */
  size?: number;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Renders an animated circular loading spinner with brand colors.
 * @param props - Spinner configuration
 * @returns Loading spinner element
 */
export function LoadingSpinner({ size = 32, className = '' }: LoadingSpinnerProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label="Loading"
    >
      <motion.div
        className="rounded-full border-2 border-[var(--color-border-primary)] border-t-brand-500"
        style={{ width: size, height: size }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
