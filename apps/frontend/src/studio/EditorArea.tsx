/**
 * @fileoverview Document well — Visual Studio-style tab groups.
 *
 * Lays out the open tab groups (panes) side by side. Each group has its own tab
 * bar; the active buffer's content is produced by the `renderBuffer` callback
 * (the parent owns designer/code/blueprint rendering). A buffer can be split into
 * a new tab group, or closed. Never nests one view inside another.
 */
import type { ReactNode } from 'react';
import { type Buffer, useWorkspaceStore } from './workspace.store';

interface EditorAreaProps {
  /** Renders the content for a given buffer (designer/code/blueprint). */
  renderBuffer: (buffer: Buffer) => ReactNode;
}

/** The multi-group document area. */
export function EditorArea({ renderBuffer }: EditorAreaProps) {
  const buffers = useWorkspaceStore((s) => s.buffers);
  const panes = useWorkspaceStore((s) => s.panes);
  const activePaneId = useWorkspaceStore((s) => s.activePaneId);
  const setActive = useWorkspaceStore((s) => s.setActive);
  const closeBuffer = useWorkspaceStore((s) => s.closeBuffer);
  const splitBuffer = useWorkspaceStore((s) => s.splitBuffer);
  const focusPane = useWorkspaceStore((s) => s.focusPane);

  return (
    <div className="flex min-w-0 flex-1 gap-2">
      {panes.map((pane) => {
        const active = pane.activeId ? buffers[pane.activeId] : undefined;
        const isActivePane = pane.id === activePaneId;
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: focusing a tab group; tabs are buttons
          <div
            key={pane.id}
            onPointerDown={() => focusPane(pane.id)}
            className={`flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border ${
              isActivePane && panes.length > 1
                ? 'border-brand-500/50'
                : 'border-[var(--color-border-primary)]'
            }`}
          >
            {/* Tab bar */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-1.5 py-1">
              {pane.bufferIds.map((id) => {
                const b = buffers[id];
                if (!b) return null;
                const isActive = pane.activeId === id;
                return (
                  <div
                    key={id}
                    className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--color-bg-elevated)] font-medium text-[var(--color-text-primary)] shadow-sm'
                        : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActive(pane.id, id)}
                      className="max-w-[180px] truncate"
                    >
                      {b.kind === 'designer' ? '▧ ' : b.kind === 'blueprint' ? '⚡ ' : '</> '}
                      {b.title}
                    </button>
                    {b.kind !== 'designer' && (
                      <button
                        type="button"
                        onClick={() => closeBuffer(pane.id, id)}
                        aria-label="Sekmeyi kapat"
                        className="text-[var(--color-text-tertiary)] transition-colors hover:text-red-500"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
              <div className="flex-1" />
              {active && (
                <button
                  type="button"
                  onClick={() => splitBuffer(active.id)}
                  title="Yeni sekme grubu (yan yana)"
                  className="shrink-0 rounded-md px-1.5 py-1 text-[13px] leading-none text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                >
                  ⇹
                </button>
              )}
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-hidden">
              {active ? (
                renderBuffer(active)
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-tertiary)]">
                  Boş grup
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
