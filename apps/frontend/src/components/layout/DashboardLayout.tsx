/**
 * @fileoverview Main layout wrapper component.
 * Composes the Sidebar, Header, and content area into the primary application shell.
 */
import { Outlet } from '@tanstack/react-router';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

/**
 * Renders the full dashboard layout with sidebar navigation, top header,
 * notification center overlay, and a main content area.
 * Uses TanStack Router's Outlet for rendering child routes.
 * @returns Dashboard layout element
 */
export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <Sidebar />
      <Header />

      {/* Main content area offset by sidebar width and header height */}
      <main className="ml-sidebar pt-header min-h-screen">
        <div className="p-5">
          <Outlet />
        </div>
      </main>

      {/* Notification center overlay */}
      <NotificationCenter />
    </div>
  );
}
