/**
 * @fileoverview Block grid renderer for the live/broadcast (TV) views.
 *
 * Renders a page's blocks at their saved grid positions through the shared
 * {@link BlockGrid} in `isLive` mode (read-only, height scaled to fill the
 * screen), identical to the builder. Animates between pages on rotation.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { BlockGrid } from '@/components/design/BlockGrid';
import type { Dashboard } from '@/types';

interface LivePanelGridProps {
  dashboard: Dashboard | null;
}

/**
 * Renders page blocks in a TV-optimized, read-only grid that fills the available
 * height. Animates between pages on rotation.
 */
export function LivePanelGrid({ dashboard }: LivePanelGridProps) {
  if (!dashboard) {
    return <CenteredMessage text="No dashboard selected" />;
  }

  if (dashboard.blocks.length === 0) {
    return <CenteredMessage text="No blocks configured" />;
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={dashboard.id}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.3 }}
          className="h-full text-white"
        >
          <BlockGrid blocks={dashboard.blocks} isLive />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Centered placeholder message for empty states. */
function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-full text-white/30 text-lg">{text}</div>
  );
}
