/**
 * @fileoverview Desktop-style application workspace shell.
 *
 * A full-viewport layout — menu/title bar, left tool rail, a tabbed document
 * area and a status bar — that feels like a native pro application, not a
 * scrolling web page. The studio's own docking manager (Toolbox/Designer/
 * Properties/…) lives inside the Boards route, so the shell carries no separate
 * inspector/dock. The window never scrolls; only the document area does.
 */
import { Outlet, useRouterState } from '@tanstack/react-router';
import { BlueprintOverlay } from '@/components/blueprint/BlueprintEditor';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { QueryBuilderOverlay } from '@/components/query/QueryBuilder';
import { MenuBar } from '@/components/shell/MenuBar';
import { MobileNav } from '@/components/shell/MobileNav';
import { StatusBar } from '@/components/shell/StatusBar';
import { TabStrip } from '@/components/shell/TabStrip';
import { ToolRail } from '@/components/shell/ToolRail';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { RunOverlay } from '@/studio/RunOverlay';
import { ShortcutsOverlay } from '@/studio/ShortcutsOverlay';

/** The full authenticated workspace. */
export function DashboardLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  // The studio workspace owns the whole surface (its own tabs, toolbar, docking).
  // Secondary routes (plugins/users/settings/…) render as ordinary padded pages.
  const fullBleed = path === '/' || path.startsWith('/boards');

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <MenuBar />

      <div className="flex-1 flex min-h-0">
        <ToolRail />

        <main className="flex-1 flex flex-col min-w-0">
          {!fullBleed && <TabStrip />}
          {fullBleed ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <Outlet />
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="p-4 sm:p-6">
                <Outlet />
              </div>
            </div>
          )}
        </main>
      </div>

      <StatusBar />

      {/* Overlays */}
      <NotificationCenter />
      <CommandPalette />
      <QueryBuilderOverlay />
      <BlueprintOverlay />
      <RunOverlay />
      <ShortcutsOverlay />
      <MobileNav />
    </div>
  );
}
