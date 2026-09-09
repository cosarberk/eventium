/**
 * @fileoverview Severity → Tailwind class mappings for design-layer renderers.
 *
 * Independent copy owned by the design layer (the legacy `panels/views` copy is
 * being removed). Uses absolute mid-tone colors that read well on both the light
 * editor theme and the dark TV theme. Neutral tones derive from the inherited
 * `currentColor` so renderers adapt to whichever surface they are mounted on.
 */
import type { PanelSeverity } from '@/types';

/** Style classes for a given semantic severity. */
export interface SeverityStyle {
  /** Text color class for emphasized text. */
  text: string;
  /** Background + text classes for a badge pill. */
  badge: string;
  /** Background color class for a status dot. */
  dot: string;
}

/** Maps each semantic severity to its style classes. */
export const SEVERITY_STYLES: Record<PanelSeverity, SeverityStyle> = {
  neutral: {
    text: 'text-current opacity-70',
    badge: 'bg-current/10 text-current opacity-80',
    dot: 'bg-current opacity-40',
  },
  info: {
    text: 'text-sky-400',
    badge: 'bg-sky-500/15 text-sky-400',
    dot: 'bg-sky-400',
  },
  success: {
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-400',
    dot: 'bg-emerald-400',
  },
  warning: {
    text: 'text-amber-400',
    badge: 'bg-amber-500/15 text-amber-400',
    dot: 'bg-amber-400',
  },
  error: {
    text: 'text-red-400',
    badge: 'bg-red-500/15 text-red-400',
    dot: 'bg-red-400',
  },
  critical: {
    text: 'text-red-500',
    badge: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40',
    dot: 'bg-red-500',
  },
};

/**
 * Resolves the style set for a severity, defaulting to neutral.
 * @param severity - The semantic severity (may be undefined)
 * @returns The matching style classes
 */
export function severityStyle(severity?: PanelSeverity): SeverityStyle {
  return SEVERITY_STYLES[severity ?? 'neutral'];
}

/**
 * Concrete hex color per severity, for contexts that cannot use Tailwind classes
 * (SVG fills in recharts: gauges, chart series). Mirrors {@link SEVERITY_STYLES}.
 */
export const SEVERITY_HEX: Record<PanelSeverity, string> = {
  neutral: '#94a3b8',
  info: '#38bdf8',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  critical: '#ef4444',
};
