/**
 * @fileoverview Navigation sidebar component.
 * Provides the primary navigation for the Eventium dashboard application.
 */
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { hasRole, type Role, usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/storage/auth.store';

/** Navigation item definition */
interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  /** Minimum role required to see this destination. */
  minRole?: Role;
}

/** SVG icon for the dashboard nav item */
function DashboardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="1" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="10" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="7" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** SVG icon for the broadcast links nav item */
function LinksIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7.5 10.5l3-3M6 12a3 3 0 01-4.24-4.24l3-3A3 3 0 019 4.76M12 6a3 3 0 014.24 4.24l-3 3A3 3 0 019 13.24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** SVG icon for the live view nav item */
function LiveIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 16h6M9 13v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** SVG icon for the plugins nav item */
function PluginsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 1v3M12 1v3M4 6h10M4 6a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V8a2 2 0 00-2-2M7 10h4M9 8v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** SVG icon for the settings nav item */
function SettingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M14.7 11.1a1.2 1.2 0 00.24 1.32l.04.04a1.46 1.46 0 11-2.06 2.06l-.04-.04a1.2 1.2 0 00-1.32-.24 1.2 1.2 0 00-.73 1.1v.12a1.46 1.46 0 11-2.91 0v-.06a1.2 1.2 0 00-.79-1.1 1.2 1.2 0 00-1.32.24l-.04.04a1.46 1.46 0 11-2.06-2.06l.04-.04a1.2 1.2 0 00.24-1.32 1.2 1.2 0 00-1.1-.73h-.12a1.46 1.46 0 010-2.91h.06a1.2 1.2 0 001.1-.79 1.2 1.2 0 00-.24-1.32l-.04-.04a1.46 1.46 0 112.06-2.06l.04.04a1.2 1.2 0 001.32.24h.06a1.2 1.2 0 00.73-1.1v-.12a1.46 1.46 0 012.91 0v.06a1.2 1.2 0 00.73 1.1 1.2 1.2 0 001.32-.24l.04-.04a1.46 1.46 0 112.06 2.06l-.04.04a1.2 1.2 0 00-.24 1.32v.06a1.2 1.2 0 001.1.73h.12a1.46 1.46 0 010 2.91h-.06a1.2 1.2 0 00-1.1.73z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** SVG icon for the users nav item */
function UsersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="6.5" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M1.5 15a5 5 0 0110 0M12 4.2a2.5 2.5 0 010 4.6M13 15a5 5 0 00-2-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Primary navigation items */
const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/links', label: 'Linklerim', icon: <LinksIcon />, minRole: 'EDITOR' },
  { path: '/plugins', label: 'Plugins', icon: <PluginsIcon />, minRole: 'EDITOR' },
  { path: '/live', label: 'Live View', icon: <LiveIcon /> },
  { path: '/users', label: 'Users', icon: <UsersIcon />, minRole: 'ADMIN' },
  { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
];

/**
 * Renders the application sidebar with branding and navigation links.
 * Highlights the active route and provides animated hover/active states.
 * @returns Sidebar navigation element
 */
export function Sidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { role } = usePermissions();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Hide destinations whose actions the server would reject anyway.
  const navItems = NAV_ITEMS.filter((item) => !item.minRole || hasRole(role, item.minRole));

  const onLogout = async () => {
    await logout();
    void navigate({ to: '/login' });
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-sidebar z-30 flex flex-col bg-[var(--color-bg-elevated)] border-r border-[var(--color-border-primary)]">
      {/* Brand */}
      <div className="h-header flex items-center px-5 border-b border-[var(--color-border-primary)]">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">E</span>
          </div>
          <span className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-brand-500 transition-colors">
            Eventium
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.path === '/' ? currentPath === '/' : currentPath.startsWith(item.path);

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-brand-500'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-brand-50 dark:bg-brand-900/20"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.icon}</span>
                  <span className="relative z-10">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: signed-in user + actions */}
      <div className="px-3 py-3 border-t border-[var(--color-border-primary)] space-y-2">
        {user && (
          <div className="px-2">
            <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
              {user.name}
            </p>
            <p className="text-[10px] text-[var(--color-text-tertiary)] truncate">
              {user.email} · {user.role}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 px-2">
          <Link
            to="/change-password"
            className="text-[11px] text-[var(--color-text-secondary)] hover:text-brand-500 transition-colors"
          >
            Change password
          </Link>
          <span className="text-[var(--color-text-tertiary)]">·</span>
          <button
            type="button"
            onClick={onLogout}
            className="text-[11px] text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
          >
            Log out
          </button>
        </div>
        <p className="px-2 text-[10px] text-[var(--color-text-tertiary)]">
          Relteco Eventium v0.1.0
        </p>
      </div>
    </aside>
  );
}
