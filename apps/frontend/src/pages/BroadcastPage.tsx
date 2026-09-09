/**
 * @fileoverview Public broadcast view page.
 * Renders shared dashboards by token without requiring authentication.
 * Provides the same TV-optimized experience as the LivePage.
 */

import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { fetchBroadcastByToken } from '@/api/broadcast';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { LiveAlarmOverlay } from '@/components/live/LiveAlarmOverlay';
import { LiveNotificationOverlay } from '@/components/live/LiveNotificationOverlay';
import { LivePanelGrid } from '@/components/live/LivePanelGrid';
import { LiveTabBar } from '@/components/live/LiveTabBar';
import { SoundGate } from '@/components/live/SoundGate';
import { useLive } from '@/hooks/useLive';
import { useSocket } from '@/hooks/useSocket';
import { useBroadcastSessionStore } from '@/storage/broadcast.store';

/**
 * Renders the public broadcast page for a shared token.
 * Fetches broadcast data via REST (no auth) and displays dashboards
 * in a TV-optimized fullscreen layout with auto-rotation.
 * @returns Broadcast page element
 */
export function BroadcastPage() {
  const { token } = useParams({ strict: false }) as { token: string };
  const [clock, setClock] = useState(formatClock());

  // Publish the token before anything that depends on it runs: the socket
  // handshake and every binding resolution authenticate with it. Assigning
  // during render (rather than in an effect) keeps it available on the very
  // first data fetch instead of one render later.
  if (useBroadcastSessionStore.getState().token !== token) {
    useBroadcastSessionStore.setState({ token });
  }

  /** Forget the token when leaving the public view. */
  useEffect(() => {
    return () => {
      useBroadcastSessionStore.setState({ token: null });
    };
  }, []);

  // Establish the real-time connection so the public TV receives live alarms.
  useSocket();

  const {
    data: broadcast,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['broadcast', token],
    queryFn: () => fetchBroadcastByToken(token),
    enabled: !!token,
    retry: 1,
    refetchInterval: 60_000,
  });

  const dashboards = broadcast?.dashboards ?? [];

  const {
    activeDashboard,
    activeDashboardId,
    rotationEnabled,
    cursorVisible,
    setActiveDashboardId,
    toggleRotation,
  } = useLive(dashboards, {
    overrideInterval: undefined,
  });

  /** Clock ticker */
  useEffect(() => {
    const interval = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(interval);
  }, []);

  /** Loading state */
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  /** Error or disabled state */
  if (error || !broadcast || !broadcast.enabled) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="white"
                strokeOpacity="0.3"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-white/70">Broadcast Unavailable</h1>
          <p className="text-sm text-white/30 mt-1 max-w-xs mx-auto">
            {!broadcast?.enabled
              ? 'This broadcast link has been disabled by the owner.'
              : 'The requested broadcast could not be found. Please check the URL.'}
          </p>
        </div>
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
          <span className="text-xs font-semibold text-white/70">{broadcast.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/50 font-mono tabular-nums">{clock}</span>
        </div>
      </div>

      {/* Tab bar (only for multi-dashboard broadcasts) */}
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
