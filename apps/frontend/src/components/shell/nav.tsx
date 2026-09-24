/**
 * @fileoverview Shared navigation config + icons for the IDE shell.
 */
import type { Role } from '@/hooks/usePermissions';

/** A navigation destination. */
export interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  minRole?: Role;
}

const ic = 'w-[18px] h-[18px]';

function HomeIcon() {
  return (
    <svg className={ic} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M3 7.5L9 2l6 5.5M4.5 6.5V15a1 1 0 001 1h7a1 1 0 001-1V6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NewIcon() {
  return (
    <svg className={ic} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect
        x="2.5"
        y="2.5"
        width="13"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M9 6v6M6 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg className={ic} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="1" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="10" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="7" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function LinksIcon() {
  return (
    <svg className={ic} viewBox="0 0 18 18" fill="none" aria-hidden="true">
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
function PluginsIcon() {
  return (
    <svg className={ic} viewBox="0 0 18 18" fill="none" aria-hidden="true">
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
function LiveIcon() {
  return (
    <svg className={ic} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 16h6M9 13v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="8" r="1.5" fill="currentColor" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg className={ic} viewBox="0 0 18 18" fill="none" aria-hidden="true">
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
function SettingsIcon() {
  return (
    <svg className={ic} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Primary navigation destinations (role-gated). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Ana Sayfa', icon: <HomeIcon /> },
  { to: '/new', label: 'Yeni', icon: <NewIcon />, minRole: 'EDITOR' },
  { to: '/boards', label: 'Panolar', icon: <DashboardIcon /> },
  { to: '/links', label: 'Linklerim', icon: <LinksIcon />, minRole: 'EDITOR' },
  { to: '/plugins', label: 'Eklentiler', icon: <PluginsIcon />, minRole: 'EDITOR' },
  { to: '/live', label: 'Canlı', icon: <LiveIcon /> },
  { to: '/users', label: 'Kullanıcılar', icon: <UsersIcon />, minRole: 'ADMIN' },
  { to: '/settings', label: 'Ayarlar', icon: <SettingsIcon /> },
];

/** Human title for the current path (top bar breadcrumb). */
export function titleForPath(path: string): string {
  if (path === '/') return 'Ana Sayfa';
  const item = NAV_ITEMS.find((n) => n.to !== '/' && path.startsWith(n.to));
  if (item) return item.label;
  if (path.startsWith('/change-password')) return 'Şifre değiştir';
  return 'Eventium';
}
