/**
 * @fileoverview TanStack Router configuration for the Eventium application.
 * Defines all routes and their component mappings.
 * Protected routes are wrapped with AuthGuard inside DashboardLayout.
 * Public routes (login, register, broadcast) have no layout wrapper.
 */
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BroadcastLinksPage } from '@/pages/BroadcastLinksPage';
import { BroadcastPage } from '@/pages/BroadcastPage';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { LivePage } from '@/pages/LivePage';
import { LoginPage } from '@/pages/LoginPage';
import { PluginsPage } from '@/pages/PluginsPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UsersPage } from '@/pages/UsersPage';
import { Launcher } from '@/studio/Launcher';
import { StudioWorkspace } from '@/studio/StudioWorkspace';

/** Root route — renders child routes via Outlet */
const rootRoute = createRootRoute({
  component: Outlet,
});

/* -------------------------------------------------------------------------- */
/*  Authenticated layout route — wraps protected routes                       */
/* -------------------------------------------------------------------------- */

/** Layout route that applies AuthGuard + DashboardLayout */
const authenticatedLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  component: () => (
    <AuthGuard>
      <DashboardLayout />
    </AuthGuard>
  ),
});

/** Studio workspace landing (/) — start screen or the open project's editor. */
const homeRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: '/',
  component: StudioWorkspace,
});

/** Boards — same studio workspace, kept for existing links (/boards). */
const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: '/boards',
  component: StudioWorkspace,
});

/** Project launcher — OnlyOffice-style "new project" start screen (/new) */
const launcherRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: '/new',
  component: Launcher,
});

/** Broadcast links management route (/links) */
const broadcastLinksRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: '/links',
  component: BroadcastLinksPage,
});

/** Plugins management route (/plugins) */
const pluginsRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: '/plugins',
  component: PluginsPage,
});

/** Settings route (/settings) */
const settingsRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: '/settings',
  component: SettingsPage,
});

/** User management route (/users) — admin only (backend-enforced). */
const usersRoute = createRoute({
  getParentRoute: () => authenticatedLayout,
  path: '/users',
  component: UsersPage,
});

/* -------------------------------------------------------------------------- */
/*  Public routes — no DashboardLayout, no auth                               */
/* -------------------------------------------------------------------------- */

/** Login route (/login) */
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

/** Register route (/register) */
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

/** Public broadcast route (/b/:token) — no auth required */
const broadcastRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/b/$token',
  component: BroadcastPage,
});

/* -------------------------------------------------------------------------- */
/*  Auth-required but no dashboard layout routes                              */
/* -------------------------------------------------------------------------- */

/** Live view layout route — applies AuthGuard without DashboardLayout */
const liveLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'live-layout',
  component: () => (
    <AuthGuard>
      <Outlet />
    </AuthGuard>
  ),
});

/** Forced/voluntary password change (/change-password) — auth, no dashboard. */
const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/change-password',
  component: () => (
    <AuthGuard>
      <ChangePasswordPage />
    </AuthGuard>
  ),
});

/** Live preview route (/live) */
const liveRoute = createRoute({
  getParentRoute: () => liveLayoutRoute,
  path: '/live',
  component: LivePage,
});

/** Live preview with specific dashboard (/live/$dashboardId) */
const liveDashboardRoute = createRoute({
  getParentRoute: () => liveLayoutRoute,
  path: '/live/$dashboardId',
  component: LivePage,
});

/* -------------------------------------------------------------------------- */
/*  Route tree assembly                                                       */
/* -------------------------------------------------------------------------- */

/** Assembled route tree */
const routeTree = rootRoute.addChildren([
  authenticatedLayout.addChildren([
    homeRoute,
    dashboardRoute,
    launcherRoute,
    broadcastLinksRoute,
    pluginsRoute,
    settingsRoute,
    usersRoute,
  ]),
  liveLayoutRoute.addChildren([liveRoute, liveDashboardRoute]),
  loginRoute,
  registerRoute,
  changePasswordRoute,
  broadcastRoute,
]);

/** Configured TanStack Router instance */
export const router = createRouter({ routeTree });

/** Type declaration for TanStack Router's type safety */
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
