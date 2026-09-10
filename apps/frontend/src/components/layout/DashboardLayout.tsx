/**
 * @fileoverview Application shell (IDE-grade).
 * Composes the activity rail, top command bar, scrollable content (Outlet),
 * bottom status bar, notification center and the global command palette.
 * Fully responsive: the rail collapses to icons on desktop and becomes a
 * slide-in drawer on mobile; overlays never squeeze the content.
 */
import { Outlet } from '@tanstack/react-router';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { QueryBuilderOverlay } from '@/components/query/QueryBuilder';
import { ActivityBar } from '@/components/shell/ActivityBar';
import { StatusBar } from '@/components/shell/StatusBar';
import { TopBar } from '@/components/shell/TopBar';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { useUIStore } from '@/storage/ui.store';

/** The full authenticated application shell. */
export function DashboardLayout() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      <ActivityBar />

      <div
        className={`min-h-screen flex flex-col transition-[margin] duration-200 ${
          collapsed ? 'md:ml-activity' : 'md:ml-sidebar'
        }`}
      >
        <TopBar />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
        <StatusBar />
      </div>

      <NotificationCenter />
      <CommandPalette />
      <QueryBuilderOverlay />
    </div>
  );
}
