/**
 * @fileoverview Tab bar component for live/broadcast views.
 * Renders a thin, subtle tab bar for switching between dashboards
 * with an active indicator and auto-rotation status.
 */
import { motion } from 'framer-motion';
import type { Dashboard, ID } from '@/types';

interface LiveTabBarProps {
  /** Available dashboards to display as tabs */
  dashboards: Dashboard[];
  /** ID of the currently active dashboard */
  activeDashboardId: ID | null;
  /** Whether auto-rotation is active */
  rotationEnabled: boolean;
  /** Callback when a tab is clicked */
  onTabClick: (id: ID) => void;
  /** Callback to toggle auto-rotation */
  onToggleRotation: () => void;
}

/**
 * Renders a compact tab bar optimized for TV displays.
 * Shows dashboard names with an animated active indicator.
 * @param props - Tab bar configuration
 * @returns Tab bar element
 */
export function LiveTabBar({
  dashboards,
  activeDashboardId,
  rotationEnabled,
  onTabClick,
  onToggleRotation,
}: LiveTabBarProps) {
  if (dashboards.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-black/40 backdrop-blur-sm border-b border-white/5">
      <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
        {dashboards.map((dashboard) => {
          const isActive = dashboard.id === activeDashboardId;
          return (
            <button
              key={dashboard.id}
              onClick={() => onTabClick(dashboard.id)}
              className={`relative px-4 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                isActive ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="live-tab-active"
                  className="absolute inset-0 rounded bg-white/10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{dashboard.name}</span>
            </button>
          );
        })}
      </div>

      {/* Rotation toggle */}
      <button
        onClick={onToggleRotation}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
          rotationEnabled
            ? 'text-emerald-400 bg-emerald-400/10'
            : 'text-white/30 hover:text-white/50'
        }`}
        title={
          rotationEnabled
            ? 'Auto-rotation on (Space to toggle)'
            : 'Auto-rotation off (Space to toggle)'
        }
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={rotationEnabled ? 'animate-spin-slow' : ''}
          aria-hidden="true"
        >
          <path
            d="M10.5 6A4.5 4.5 0 111.5 6a4.5 4.5 0 019 0z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M6 1.5V3M10.5 6H9"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        {rotationEnabled ? 'AUTO' : 'MANUAL'}
      </button>
    </div>
  );
}
