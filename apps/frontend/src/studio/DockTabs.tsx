/**
 * @fileoverview Custom docking tab — title + close, plus a per-panel count badge.
 *
 * Any panel that has a meaningful quantity shows a small badge in its tab
 * (Anahat = öğe, Konsol = çıktı, Veri = kaynak, Sorunlar = uyarı/hata), coloured
 * by severity. Because the count lives on the tab, panels carry no redundant
 * title header of their own. Replaces dockview's default tab.
 */
import type { IDockviewPanelHeaderProps } from 'dockview-react';
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
  return (
    <div className="studio-tab flex h-full items-center gap-1.5 pl-2.5 pr-1">
      <span className="truncate text-[12px]">{title}</span>
      <PanelBadge id={props.api.id} />
      <button
        type="button"
        aria-label="Kapat"
        onClick={(e) => {
          e.stopPropagation();
          props.api.close();
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
    </div>
  );
}
