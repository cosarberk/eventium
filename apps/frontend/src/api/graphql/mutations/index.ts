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

/** Reusable page selection set for project mutations. */
const PAGE_FIELDS = `
  id
  name
  description
  layout
  isDefault
  projectId
  pageOrder
  blocks { ${BLOCK_FIELDS} }
  createdAt
  updatedAt
`;

/** Reusable project selection set. */
const PROJECT_FIELDS = `
  id
  name
  type
  description
  createdAt
  updatedAt
  pages { ${PAGE_FIELDS} }
`;

/** Creates a project (with one empty starter page). */
export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) { ${PROJECT_FIELDS} }
  }
`;

/** Updates a project's name/type/description. */
export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) { ${PROJECT_FIELDS} }
  }
`;

/** Deletes a project and all of its pages. */
export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id) { id }
  }
`;

/** Adds a new empty page to a project. */
export const CREATE_PAGE = gql`
  mutation CreatePage($projectId: ID!, $name: String!) {
    createPage(projectId: $projectId, name: $name) { ${PAGE_FIELDS} }
  }
`;

/** Reusable node selection set. */
const NODE_FIELDS = `
  id
  projectId
  parentId
  kind
  name
  order
  refId
  data
  createdAt
  updatedAt
`;

/** Creates a folder or typed file in a project's tree. */
export const CREATE_NODE = gql`
  mutation CreateNode($input: CreateNodeInput!) {
    createNode(input: $input) { ${NODE_FIELDS} }
  }
`;

/** Renames a tree node. */
export const RENAME_NODE = gql`
  mutation RenameNode($id: ID!, $name: String!) {
    renameNode(id: $id, name: $name) { ${NODE_FIELDS} }
  }
`;

/** Moves a node under a new parent. */
export const MOVE_NODE = gql`
  mutation MoveNode($id: ID!, $parentId: ID, $order: Int!) {
    moveNode(id: $id, parentId: $parentId, order: $order) { ${NODE_FIELDS} }
  }
`;

/** Deletes a node and its descendants. */
export const DELETE_NODE = gql`
  mutation DeleteNode($id: ID!) {
    deleteNode(id: $id) { id }
  }
`;

/** Duplicates a file node (page copies blocks; others copy data). */
export const DUPLICATE_NODE = gql`
  mutation DuplicateNode($id: ID!) {
    duplicateNode(id: $id) { ${NODE_FIELDS} }
  }
`;

/** Replaces a non-page file node's content JSON. */
export const SET_NODE_DATA = gql`
  mutation SetNodeData($id: ID!, $data: JSON!) {
    setNodeData(id: $id, data: $data) { ${NODE_FIELDS} }
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
