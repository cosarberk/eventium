/**
 * @fileoverview Left tool rail — icon-only navigation dock (desktop).
 * Active view marked with an accent bar (VS-style). Hidden on mobile (a drawer
 * is used there instead).
 */
import { Link, useRouterState } from '@tanstack/react-router';
import { hasRole, usePermissions } from '@/hooks/usePermissions';
import { NAV_ITEMS } from './nav';

/** The icon rail. */
export function ToolRail() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role } = usePermissions();
  const items = NAV_ITEMS.filter((i) => !i.minRole || hasRole(role, i.minRole));

  return (
    <nav className="hidden md:flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] py-2">
      {items.map((item) => {
        const active = item.to === '/' ? path === '/' : path.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              active
                ? 'text-brand-500 bg-brand-500/10'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {active && (
              <span className="absolute left-[-8px] top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-500" />
            )}
            {item.icon}
            {/* Hover label chip (VS-style) */}
            <span className="pointer-events-none absolute left-full ml-2 z-50 hidden whitespace-nowrap rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-primary)] shadow-lg group-hover:block">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
