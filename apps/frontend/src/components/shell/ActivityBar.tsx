/**
 * @fileoverview Activity rail — the IDE shell's primary navigation.
 * Collapsible (icons-only ↔ icons+labels) on desktop; a slide-in Drawer on
 * mobile. Role-aware. Footer carries theme toggle + the signed-in user.
 */
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/hooks/useAuth';
import { hasRole, usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/storage/auth.store';
import { useUIStore } from '@/storage/ui.store';
import { NAV_ITEMS } from './nav';

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role } = usePermissions();
  const items = NAV_ITEMS.filter((i) => !i.minRole || hasRole(role, i.minRole));

  return (
    <nav className="flex-1 px-2 py-3 overflow-y-auto">
      <ul className="space-y-1">
        {items.map((item) => {
          const active = item.to === '/' ? path === '/' : path.startsWith(item.to);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  active
                    ? 'text-brand-500'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="rail-active"
                    className="absolute inset-0 rounded-lg bg-brand-500/10 ring-1 ring-brand-500/20"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{item.icon}</span>
                {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ThemeButton({ collapsed }: { collapsed: boolean }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors ${
        collapsed ? 'justify-center' : ''
      }`}
      aria-label="Toggle theme"
    >
      <span className="shrink-0">
        {isDark ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M15 9.5A6 6 0 118 2.5a4.5 4.5 0 007 7z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
      {!collapsed && <span>{isDark ? 'Dark' : 'Light'}</span>}
    </button>
  );
}

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  const onLogout = async () => {
    await logout();
    void navigate({ to: '/login' });
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        <div
          className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-500 flex items-center justify-center text-xs font-bold"
          title={user ? `${user.name} · ${user.role}` : ''}
        >
          {initial}
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:text-red-500 hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M6 2H3.5A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14H6M10.5 11L14 8l-3.5-3M14 8H6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-500 flex items-center justify-center text-xs font-bold shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
            {user?.name}
          </p>
          <p className="text-[10px] text-[var(--color-text-tertiary)] truncate">
            {user?.email} · {user?.role}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 px-1 text-[11px]">
        <Link
          to="/change-password"
          className="text-[var(--color-text-secondary)] hover:text-brand-500 transition-colors"
        >
          Change password
        </Link>
        <span className="text-[var(--color-text-tertiary)]">·</span>
        <button
          type="button"
          onClick={onLogout}
          className="text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${collapsed ? 'justify-center' : ''}`}>
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm shadow-brand-500/30 shrink-0">
        <span className="text-white text-sm font-black">E</span>
      </div>
      {!collapsed && (
        <span className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)] group-hover:text-brand-500 transition-colors">
          Eventium
        </span>
      )}
    </Link>
  );
}

/** The activity rail. Desktop rail + mobile drawer. */
export function ActivityBar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col bg-[var(--color-bg-elevated)] border-r border-[var(--color-border-primary)] transition-[width] duration-200 ${
          collapsed ? 'w-activity' : 'w-sidebar'
        }`}
      >
        <div
          className={`h-header flex items-center border-b border-[var(--color-border-primary)] ${
            collapsed ? 'justify-center px-0' : 'px-4'
          }`}
        >
          <Brand collapsed={collapsed} />
        </div>
        <NavList collapsed={collapsed} />
        <div className="px-2 py-3 border-t border-[var(--color-border-primary)] space-y-2">
          <ThemeButton collapsed={collapsed} />
          <UserFooter collapsed={collapsed} />
          <button
            type="button"
            onClick={toggleSidebar}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
            >
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {!collapsed && <span>Daralt</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        side="left"
        widthClass="md:max-w-xs"
        title="Eventium"
      >
        <div className="flex flex-col h-full -m-4">
          <NavList collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
          <div className="px-2 py-3 border-t border-[var(--color-border-primary)] space-y-2">
            <ThemeButton collapsed={false} />
            <UserFooter collapsed={false} />
          </div>
        </div>
      </Drawer>
    </>
  );
}
