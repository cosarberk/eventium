/**
 * @fileoverview One-time "tap to start" gate for live/TV views.
 * Browsers block audio until a user gesture occurs. This overlay collects a
 * single tap to unlock alarm sound and (optionally) enter fullscreen, then
 * disappears for the rest of the session.
 */
import { motion } from 'framer-motion';
import { useState } from 'react';
import { unlockAudio } from '@/utils/sound';

interface SoundGateProps {
  /** Whether to request fullscreen on activation (true for TV/kiosk). */
  requestFullscreen?: boolean;
}

/**
 * Renders a dismissible activation gate. Returns null once activated.
 * @param props - Activation behavior
 */
export function SoundGate({ requestFullscreen = false }: SoundGateProps) {
  const [active, setActive] = useState(false);

  if (active) return null;

  const activate = () => {
    unlockAudio();
    if (requestFullscreen && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
    setActive(true);
  };

  return (
    <motion.button
      type="button"
      onClick={activate}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center gap-5 bg-[#0a0a0f] text-white cursor-pointer"
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-400"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Tap to start the display</h1>
        <p className="mt-2 text-sm text-white/50 max-w-sm">
          Enables alarm sound{requestFullscreen ? ' and fullscreen' : ''} for this screen. Required
          once per session by your browser.
        </p>
      </div>
    </motion.button>
  );
}
