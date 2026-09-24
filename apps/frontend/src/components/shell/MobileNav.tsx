/**
 * @fileoverview Mobile navigation — a slide-in drawer used on small screens in
 * place of the desktop tool rail.
 */
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/hooks/useAuth';
import { hasRole, usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/storage/auth.store';
import { useUIStore } from '@/storage/ui.store';
import { NAV_ITEMS } from './nav';

/** Mobile nav drawer. */
export function MobileNav() {
  const open = useUIStore((s) => s.mobileNavOpen);
  const setOpen = useUIStore((s) => s.setMobileNavOpen);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role } = usePermissions();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const items = NAV_ITEMS.filter((i) => !i.minRole || hasRole(role, i.minRole));

  const onLogout = async () => {
    await logout();
    setOpen(false);
    void navigate({ to: '/login' });
  };

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      side="left"
      title="Eventium"
      widthClass="md:max-w-xs"
    >
      <div className="flex flex-col h-full -m-4">
        <nav className="flex-1 p-2 space-y-1">
          {items.map((item) => {
            const active = item.to === '/' ? path === '/' : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'text-brand-500 bg-brand-500/10'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--color-border-primary)] p-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
              {user?.name}
            </p>
            <p className="text-[10px] text-[var(--color-text-tertiary)] truncate">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-[11px] text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </Drawer>
  );
}
