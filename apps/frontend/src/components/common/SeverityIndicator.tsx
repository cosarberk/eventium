/**
 * @fileoverview Severity level indicator component.
 * Visual representation of event severity using colors and labels.
 */
import type { Severity } from '@/types';

interface SeverityIndicatorProps {
  severity: Severity;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: 'bg-red-500',
  ERROR: 'bg-orange-500',
  WARNING: 'bg-amber-500',
  INFO: 'bg-blue-400',
};

const SEVERITY_TEXT_COLORS: Record<Severity, string> = {
  CRITICAL: 'text-red-500',
  ERROR: 'text-orange-500',
  WARNING: 'text-amber-500',
  INFO: 'text-blue-400',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  CRITICAL: 'Critical',
  ERROR: 'Error',
  WARNING: 'Warning',
  INFO: 'Info',
};

/**
 * Renders a severity indicator with a colored dot and optional label.
 */
export function SeverityIndicator({
  severity,
  showLabel = true,
  size = 'md',
  className = '',
}: SeverityIndicatorProps) {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`${dotSize} rounded-full ${SEVERITY_COLORS[severity]} shrink-0`}
        aria-hidden="true"
      />
      {showLabel && (
        <span className={`${textSize} font-medium ${SEVERITY_TEXT_COLORS[severity]}`}>
          {SEVERITY_LABELS[severity]}
        </span>
      )}
    </span>
  );
}
