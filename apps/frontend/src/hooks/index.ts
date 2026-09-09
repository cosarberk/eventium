/**
 * @fileoverview Barrel export for all React hooks.
 */

export { useAuth } from './useAuth';
export { useBroadcastLinks } from './useBroadcastLinks';
export { useDashboard } from './useDashboard';
export { useEvents } from './useEvents';
export { useLive } from './useLive';
export { useNotificationRules, useNotifications } from './useNotifications';
export { hasRole, type Permissions, ROLE_ORDER, type Role, usePermissions } from './usePermissions';
export {
  useAvailablePlugins,
  useConfigurePlugin,
  useInstallPlugin,
  usePlugins,
  useTogglePlugin,
  useUninstallPlugin,
} from './usePlugins';
export { useEventSubscription, useSocket } from './useSocket';
export { useSound } from './useSound';
export { useSourceCapabilities } from './useSourceCapabilities';
export { useTheme } from './useTheme';
