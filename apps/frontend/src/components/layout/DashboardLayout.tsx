/**
 * @fileoverview Desktop-style application workspace shell.
 *
 * A full-viewport, multi-pane layout — menu/title bar, left tool rail, a tabbed
 * document area, a resizable inspector dock and a status bar — that feels like a
 * native pro application (VS/SolidWorks), not a scrolling web page. The window
 * never scrolls; only the document area does. Fully responsive: on mobile the
 * rail/inspector collapse and navigation moves into a drawer.
 */
import { Outlet } from '@tanstack/react-router';
import { BlueprintOverlay } from '@/components/blueprint/BlueprintEditor';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { QueryBuilderOverlay } from '@/components/query/QueryBuilder';
import { Inspector } from '@/components/shell/Inspector';
import { MenuBar } from '@/components/shell/MenuBar';
import { MobileNav } from '@/components/shell/MobileNav';
import { StatusBar } from '@/components/shell/StatusBar';
import { TabStrip } from '@/components/shell/TabStrip';
import { ToolRail } from '@/components/shell/ToolRail';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { WorkspaceDock } from '@/studio/WorkspaceDock';

/** The full authenticated workspace. */
export function DashboardLayout() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <MenuBar />

      <div className="flex-1 flex min-h-0">
        <ToolRail />

        <main className="flex-1 flex flex-col min-w-0">
          <TabStrip />
          <div className="flex-1 overflow-auto">
            <div className="p-4 sm:p-6">
              <Outlet />
            </div>
          </div>
          <WorkspaceDock />
        </main>

        <Inspector />
      </div>

      <StatusBar />

      {/* Overlays */}
      <NotificationCenter />
      <CommandPalette />
      <QueryBuilderOverlay />
      <BlueprintOverlay />
      <MobileNav />
    </div>
  );
}
