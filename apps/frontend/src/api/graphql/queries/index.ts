/**
 * @fileoverview GraphQL query definitions matching the backend schema.
 */
import { gql } from 'urql';

/** Reusable block selection set for pages. */
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

/** Fetches paginated events with optional filters. */
export const GET_EVENTS = gql`
  query GetEvents($filter: EventFilterInput) {
    events(filter: $filter) {
      items {
        id
        pluginInstanceId
        sourceType
        pluginInstance { id pluginId name }
        eventType
        title
        description
        payload
        severity
        createdAt
      }
      total
    }
  }
`;

/** Fetches all available data-source definitions with their capabilities. */
export const GET_AVAILABLE_PLUGINS = gql`
  query GetAvailablePlugins {
    availablePlugins {
      id
      name
      description
      version
      author
      icon
      configFields { key label type required defaultValue description }
      capabilities
    }
  }
`;

/** Fetches all installed data-source instances. */
export const GET_PLUGINS = gql`
  query GetPlugins {
    plugins {
      id
      pluginId
      name
      config
      metadata
      enabled
      syncedAt
      createdAt
      updatedAt
    }
  }
`;

/** Fetches the queryable capability surface of every enabled instance. */
export const GET_SOURCE_CAPABILITIES = gql`
  query GetSourceCapabilities {
    sourceCapabilities {
      instanceId
      sourceType
      name
      capabilities
    }
  }
`;

/** Resolves an array of bindings to shaped values (scalar/series/list). */
export const RESOLVE_BINDINGS = gql`
  query ResolveBindings($bindings: JSON!, $broadcastToken: String) {
    resolveBindings(bindings: $bindings, broadcastToken: $broadcastToken)
  }
`;

/** Fetches public server configuration (resolved webhook base URL, etc.). */
export const GET_SERVER_CONFIG = gql`
  query GetServerConfig {
    serverConfig { webhookBaseUrl }
  }
`;

/** Fetches the monitorable targets for a data-source instance + webhook status. */
export const GET_WEBHOOK_TARGETS = gql`
  query GetWebhookTargets($pluginInstanceId: ID!, $webhookUrl: String!) {
    webhookTargets(pluginInstanceId: $pluginInstanceId, webhookUrl: $webhookUrl)
  }
`;

/** Fetches all dashboards (pages). */
export const GET_DASHBOARDS = gql`
  query GetDashboards {
    dashboards {
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

/** Fetches a single dashboard by ID. */
export const GET_DASHBOARD = gql`
  query GetDashboard($id: ID!) {
    dashboard(id: $id) {
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

/**
 * Exports a page as a portable, instance-agnostic `PageSpec` (JSON). Strips
 * server identity and instance-bound binding fields so it can be shared/imported
 * onto another Eventium installation.
 */
export const EXPORT_PAGE = gql`
  query ExportPage($id: ID!) {
    exportPage(id: $id)
  }
`;

/** Fetches all notification rules. */
export const GET_NOTIFICATION_RULES = gql`
  query GetNotificationRules {
    notificationRules {
      id
      name
      eventPattern
      conditions
      actions
      enabled
      createdAt
      updatedAt
    }
  }
`;

/** Fetches a single notification rule by ID. */
export const GET_NOTIFICATION_RULE = gql`
  query GetNotificationRule($id: ID!) {
    notificationRule(id: $id) {
      id
      name
      eventPattern
      conditions
      actions
      enabled
      createdAt
      updatedAt
    }
  }
`;

/** Fetches all broadcast links for the current user. */
export const GET_BROADCAST_LINKS = gql`
  query GetBroadcastLinks {
    broadcastLinks {
      id
      token
      name
      enabled
      dashboards {
        id
        name
        description
        isDefault
        blocks { ${BLOCK_FIELDS} }
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;

/** Fetches a single broadcast link by its public token (no auth). */
export const GET_BROADCAST_LINK = gql`
  query GetBroadcastLink($token: String!) {
    broadcastLink(token: $token) {
      id
      token
      name
      enabled
      dashboards {
        id
        name
        description
        isDefault
        blocks { ${BLOCK_FIELDS} }
        createdAt
        updatedAt
      }
    }
  }
`;
