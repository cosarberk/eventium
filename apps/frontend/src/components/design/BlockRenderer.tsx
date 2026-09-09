/**
 * @fileoverview BlockRenderer — renders a single page block.
 *
 * Resolves the block's bindings via {@link useBlockData}, looks up its component
 * renderer in the registry, and draws it inside the appropriate shell (an
 * editable panel in the builder, a TV card in the live/broadcast view). The
 * design layer is component-agnostic: unknown types degrade gracefully instead
 * of crashing the page.
 */
import type { ReactNode } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getComponent } from '@/components/design/registry';
import { PanelWrapper } from '@/components/panels/PanelWrapper';
import { useBlockData } from '@/hooks/useBlockData';
import type { DashboardBlock } from '@/types';

/** Props for {@link BlockRenderer}. */
export interface BlockRendererProps {
  /** The block to render. */
  block: DashboardBlock;
  /** True in the live/TV view (denser, dark shell). */
  isLive?: boolean;
  /** True in the builder edit mode (drag handle + remove/configure controls). */
  editing?: boolean;
  /** Remove handler, shown as a control when editing. */
  onRemove?: () => void;
  /** Configure handler, shown as a control when editing. */
  onConfigure?: () => void;
}

/** A centered, muted placeholder used for empty/error/unknown states. */
function Placeholder({ isLive, children }: { isLive?: boolean; children: ReactNode }) {
  return (
    <div
      className={`flex h-full items-center justify-center px-4 text-center text-xs ${
        isLive ? 'text-white/30' : 'text-[var(--color-text-tertiary)]'
      }`}
    >
      {children}
    </div>
  );
}

/** Resolves and renders the inner body of a block (no shell). */
function BlockBody({ block, isLive }: { block: DashboardBlock; isLive?: boolean }) {
  const { data, isLoading, error } = useBlockData(block);
  const entry = getComponent(block.componentType);

  if (!entry) {
    return (
      <Placeholder isLive={isLive}>
        Unknown component <code className="font-mono">{block.componentType}</code>
      </Placeholder>
    );
  }

  if (error) {
    return <Placeholder isLive={isLive}>Failed to load data: {error.message}</Placeholder>;
  }

  const hasBindings = Object.values(block.slots).some((slot) => slot.values.length > 0);
  if (isLoading && hasBindings) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{entry.render({ block, data, isLive })}</>;
}

/** TV/broadcast card shell used in the live view. */
function LiveShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
      {title && (
        <div className="flex items-center border-b border-white/5 px-4 py-2 shrink-0">
          <h3 className="truncate text-xs font-bold uppercase tracking-widest text-white/60">
            {title}
          </h3>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto text-white/90">{children}</div>
    </div>
  );
}

/**
 * Renders a block with the correct shell for its context.
 * @param props - See {@link BlockRendererProps}.
 */
export function BlockRenderer({
  block,
  isLive,
  editing,
  onRemove,
  onConfigure,
}: BlockRendererProps): ReactNode {
  const body = <BlockBody block={block} isLive={isLive} />;

  if (isLive) {
    return <LiveShell title={block.title}>{body}</LiveShell>;
  }

  return (
    <PanelWrapper
      title={block.title}
      editing={editing}
      onRemove={onRemove}
      onConfigure={onConfigure}
    >
      {body}
    </PanelWrapper>
  );
}
