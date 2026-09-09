/**
 * @fileoverview Full-screen live preview page for TV/monitor displays.
 * Provides auto-rotating dashboard views with keyboard controls,
 * cursor auto-hide, and a Bloomberg Terminal-inspired dark theme.
 */
import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { LiveAlarmOverlay } from '@/components/live/LiveAlarmOverlay';
import { LiveNotificationOverlay } from '@/components/live/LiveNotificationOverlay';
import { LivePanelGrid } from '@/components/live/LivePanelGrid';
import { LiveTabBar } from '@/components/live/LiveTabBar';
import { SoundGate } from '@/components/live/SoundGate';
import { useDashboard } from '@/hooks/useDashboard';
import { useLive } from '@/hooks/useLive';
import { useSocket } from '@/hooks/useSocket';

/**
 * Renders the full-screen live preview page.
 * Forces dark theme, auto-hides cursor, and supports keyboard shortcuts:
 * - Escape: exit (back) or exit fullscreen
 * - Left/Right: switch dashboards
 * - F: toggle fullscreen
 * - Space: toggle auto-rotation
 * @returns Live page element
 */
export function LivePage() {
  const { dashboards, isLoading, setDashboards } = useDashboard();
  const { isConnected } = useSocket();
  const [clock, setClock] = useState(formatClock());

  const {
    activeDashboard,
    activeDashboardId,
    rotationEnabled,
    cursorVisible,
    setActiveDashboardId,
    toggleRotation,
  } = useLive(dashboards);

  /** Sync dashboards from query to store */
  useEffect(() => {
    if (dashboards.length > 0) {
      setDashboards(dashboards);
    }
  }, [dashboards, setDashboards]);

  /** Clock ticker */
  useEffect(() => {
    const interval = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-[#0a0a0f] text-white flex flex-col overflow-hidden select-none"
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">E</span>
          </div>
          <span className="text-xs font-semibold text-white/70">Eventium Live</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
              }`}
            />
            <span className="text-[10px] text-white/40 font-mono">
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          {/* Clock */}
          <span className="text-xs text-white/50 font-mono tabular-nums">{clock}</span>
        </div>
      </div>

      {/* Tab bar */}
      <LiveTabBar
        dashboards={dashboards}
        activeDashboardId={activeDashboardId}
        rotationEnabled={rotationEnabled}
        onTabClick={setActiveDashboardId}
        onToggleRotation={toggleRotation}
      />

      {/* Panel grid */}
      <div className="flex-1 overflow-hidden">
        <LivePanelGrid dashboard={activeDashboard} />
      </div>

      {/* Corner toast overlay for notable events */}
      <LiveNotificationOverlay />

      {/* Full-screen hospital-style alarm for releases/failures */}
      <LiveAlarmOverlay />

      {/* One-time tap gate to unlock alarm sound + fullscreen */}
      <SoundGate requestFullscreen />

      {/* Keyboard hint (fades out) */}
      <KeyboardHint />
    </div>
  );
}

/**
 * Formats the current time as HH:MM:SS.
 * @returns Formatted time string
 */
function formatClock(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Renders a dismissable keyboard shortcut hint overlay
 * that automatically fades out after a few seconds.
 * @returns Keyboard hint element
 */
function KeyboardHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-out">
      <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10">
        {[
          { key: 'Esc', label: 'Exit' },
          { key: '\u2190\u2192', label: 'Navigate' },
          { key: 'F', label: 'Fullscreen' },
          { key: 'Space', label: 'Rotation' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/70">
              {key}
            </kbd>
            <span className="text-[10px] text-white/40">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
