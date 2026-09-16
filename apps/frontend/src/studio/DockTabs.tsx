/**
 * @fileoverview Custom docking tab — title + close, plus a per-panel count badge.
 *
 * Any panel that has a meaningful quantity shows a small badge in its tab
 * (Anahat = öğe, Konsol = çıktı, Veri = kaynak, Sorunlar = uyarı/hata), coloured
 * by severity. Because the count lives on the tab, panels carry no redundant
 * title header of their own. Replaces dockview's default tab.
 */
import type { IDockviewPanelHeaderProps } from 'dockview-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSourceCapabilities } from '@/hooks/useSourceCapabilities';
import { useDashboardStore } from '@/storage/dashboard.store';
import { useConsoleStore } from './console.store';
import { usePageProblems } from './usePageProblems';

type Tone = 'neutral' | 'warn' | 'error';

/** A small count pill; hidden when count is 0. */
function Badge({ count, tone = 'neutral' }: { count: number; tone?: Tone }) {
  if (count <= 0) return null;
  const cls =
    tone === 'error'
      ? 'bg-red-500 text-white'
      : tone === 'warn'
        ? 'bg-amber-500 text-white'
        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]';
  return (
    <span
      className={`inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${cls}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function ProblemsBadge() {
  const { total, errors } = usePageProblems();
  return <Badge count={total} tone={errors > 0 ? 'error' : 'warn'} />;
}

function OutlineBadge() {
  const count = useDashboardStore((s) => s.activeDashboard?.blocks.length ?? 0);
  return <Badge count={count} />;
}

function ConsoleBadge() {
  const entries = useConsoleStore((s) => s.entries);
  const hasError = entries.some((e) => e.level === 'error');
  return <Badge count={entries.length} tone={hasError ? 'error' : 'neutral'} />;
}

function DataBadge() {
  const { capabilities } = useSourceCapabilities();
  return <Badge count={capabilities.length} />;
}

/** The badge for a given panel id (null when the panel has no count). */
function PanelBadge({ id }: { id: string }) {
  switch (id) {
    case 'problems':
      return <ProblemsBadge />;
    case 'outline':
      return <OutlineBadge />;
    case 'console':
      return <ConsoleBadge />;
    case 'data':
      return <DataBadge />;
    default:
      return null;
  }
}

/** The studio's tab renderer for every dock panel. */
export function StudioTab(props: IDockviewPanelHeaderProps) {
  const title = props.api.title ?? '';
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  /** Panels sharing this tab's group. */
  const groupPanels = () => props.api.group?.panels ?? [];

  const closeSelf = () => props.api.close();
  const closeOthers = () => {
    for (const p of groupPanels()) if (p.id !== props.api.id) p.api.close();
  };
  const closeAllInGroup = () => {
    for (const p of [...groupPanels()]) p.api.close();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tab right-click menu; the tab itself is a dockview control
    <div
      className="studio-tab flex h-full items-center gap-1.5 pl-2.5 pr-1"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <span className="truncate text-[12px]">{title}</span>
      <PanelBadge id={props.api.id} />
      <button
        type="button"
        aria-label="Kapat"
        onClick={(e) => {
          e.stopPropagation();
          closeSelf();
        }}
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M2 2l6 6M8 2l-6 6"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {menu && (
        <TabMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Kapat', run: closeSelf },
            { label: 'Diğerlerini kapat', run: closeOthers },
            { label: 'Gruptakileri kapat', run: closeAllInGroup },
          ]}
        />
      )}
    </div>
  );
}

/** Small right-click menu for a document tab. */
function TabMenu({
  x,
  y,
  onClose,
  items,
}: {
  x: number;
  y: number;
  onClose: () => void;
  items: { label: string; run: () => void }[];
}) {
  // Portal to body so the fixed menu isn't offset by dockview's transformed tabs.
  return createPortal(
    <>
      <button
        type="button"
        aria-label="Menüyü kapat"
        className="fixed inset-0 z-[9998] cursor-default"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-[9999] min-w-[168px] rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] py-1 shadow-xl"
        style={{
          left: Math.min(x, window.innerWidth - 180),
          top: Math.min(y, window.innerHeight - 140),
        }}
      >
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={() => {
              onClose();
              it.run();
            }}
            className="flex w-full items-center px-3 py-1.5 text-left text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            {it.label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}
