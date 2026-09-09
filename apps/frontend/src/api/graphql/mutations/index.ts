/**
 * @fileoverview GraphQL mutation definitions matching the backend schema exactly.
 */
import { gql } from 'urql';

/** Reusable block selection set. */
const BLOCK_FIELDS = `
  id
  componentType
  title
  slots
  options
  position
  size
  sortOrder
`;

/** Creates a new dashboard */
export const CREATE_DASHBOARD = gql`
  mutation CreateDashboard($input: CreateDashboardInput!) {
    createDashboard(input: $input) {
      id
      name
      description
      layout
      isDefault
      blocks { ${BLOCK_FIELDS} }
      createdAt
      updatedAt
    }
  }
`;

/** Updates an existing dashboard */
export const UPDATE_DASHBOARD = gql`
  mutation UpdateDashboard($id: ID!, $input: UpdateDashboardInput!) {
    updateDashboard(id: $id, input: $input) {
      id
      name
      description
      layout
      isDefault
      blocks { ${BLOCK_FIELDS} }
      createdAt
      updatedAt
    }
  }
`;

/** Deletes a dashboard */
export const DELETE_DASHBOARD = gql`
  mutation DeleteDashboard($id: ID!) {
    deleteDashboard(id: $id) {
      id
    }
  }
`;

/** Installs a new plugin instance */
export const INSTALL_PLUGIN = gql`
  mutation InstallPlugin($input: InstallPluginInput!) {
    installPlugin(input: $input) {
      id
      pluginId
      name
      config
      metadata
      enabled
      syncedAt
      createdAt
    }
  }
`;

/** Registers/unregisters the Eventium webhook across the given projects */
export const SYNC_WEBHOOK_TARGETS = gql`
  mutation SyncWebhookTargets($pluginInstanceId: ID!, $targetIds: [String!]!, $webhookUrl: String!) {
    syncWebhookTargets(
      pluginInstanceId: $pluginInstanceId
      targetIds: $targetIds
      webhookUrl: $webhookUrl
    )
  }
`;

/** Syncs metadata from the plugin's external API */
export const SYNC_PLUGIN_METADATA = gql`
  mutation SyncPluginMetadata($id: ID!) {
    syncPluginMetadata(id: $id) {
      id
      metadata
      syncedAt
    }
  }
`;

/** Uninstalls a plugin instance */
export const UNINSTALL_PLUGIN = gql`
  mutation UninstallPlugin($id: ID!) {
    uninstallPlugin(id: $id) {
      id
      pluginId
      name
    }
  }
`;

/** Updates plugin instance configuration */
export const CONFIGURE_PLUGIN = gql`
  mutation ConfigurePlugin($id: ID!, $input: ConfigurePluginInput!) {
    configurePlugin(id: $id, input: $input) {
      id
      config
    }
  }
`;

/** Toggles a plugin instance on or off */
export const TOGGLE_PLUGIN = gql`
  mutation TogglePlugin($id: ID!, $enabled: Boolean!) {
    togglePlugin(id: $id, enabled: $enabled) {
      id
      enabled
    }
  }
`;

/**
 * Imports a portable `PageSpec` as a new dashboard. `sourceMapping` maps each
 * required source *type* to a locally installed plugin instance id so the
 * spec's instance-agnostic bindings can be re-bound.
 */
export const IMPORT_PAGE = gql`
  mutation ImportPage($spec: JSON!, $sourceMapping: JSON!) {
    importPage(spec: $spec, sourceMapping: $sourceMapping) {
      id
      name
    }
  }
`;

/** Creates a new notification rule */
export const CREATE_NOTIFICATION_RULE = gql`
  mutation CreateNotificationRule($input: CreateNotificationRuleInput!) {
    createNotificationRule(input: $input) {
      id
      name
      eventPattern
      conditions
      actions
      enabled
      createdAt
    }
  }
`;

/** Updates an existing notification rule */
export const UPDATE_NOTIFICATION_RULE = gql`
  mutation UpdateNotificationRule($id: ID!, $input: UpdateNotificationRuleInput!) {
    updateNotificationRule(id: $id, input: $input) {
      id
      name
      eventPattern
      conditions
      actions
      enabled
      updatedAt
    }
  }
`;

/** Deletes a notification rule */
export const DELETE_NOTIFICATION_RULE = gql`
  mutation DeleteNotificationRule($id: ID!) {
    deleteNotificationRule(id: $id) {
      id
    }
  }
`;

/** Creates a new broadcast link */
export const CREATE_BROADCAST_LINK = gql`
  mutation CreateBroadcastLink($input: CreateBroadcastLinkInput!) {
    createBroadcastLink(input: $input) {
      id
      token
      name
      enabled
      dashboards {
        id
        name
      }
      createdAt
      updatedAt
    }
  }
`;

/** Updates an existing broadcast link */
export const UPDATE_BROADCAST_LINK = gql`
  mutation UpdateBroadcastLink($id: ID!, $input: UpdateBroadcastLinkInput!) {
    updateBroadcastLink(id: $id, input: $input) {
      id
      token
      name
      enabled
      dashboards {
        id
        name
      }
      updatedAt
    }
  }
`;

/** Deletes a broadcast link */
export const DELETE_BROADCAST_LINK = gql`
  mutation DeleteBroadcastLink($id: ID!) {
    deleteBroadcastLink(id: $id) {
      id
    }
  }
`;

/** Regenerates the token for a broadcast link */
export const REGENERATE_BROADCAST_LINK_TOKEN = gql`
  mutation RegenerateBroadcastLinkToken($id: ID!) {
    regenerateBroadcastLinkToken(id: $id) {
      id
      token
    }
  }
`;
