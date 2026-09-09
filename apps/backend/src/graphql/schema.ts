/**
 * @file GraphQL schema definition (SDL).
 *
 * The API is built around data sources (pure queryable/streamable plugins) and
 * the design layer (pages of component blocks whose slots hold cross-source
 * bindings). Sources never contribute view models; the client resolves bindings
 * and renders components.
 */

export const typeDefs = `
  """Severity levels for events."""
  enum Severity {
    INFO
    WARNING
    ERROR
    CRITICAL
  }

  """A data-source instance installed on the platform."""
  type Plugin {
    id: ID!
    pluginId: String!
    name: String!
    config: JSON!
    metadata: JSON!
    enabled: Boolean!
    syncedAt: String
    createdAt: String!
    updatedAt: String!
  }

  """An event produced by a data-source instance."""
  type Event {
    id: ID!
    pluginInstanceId: String!
    sourceType: String!
    pluginInstance: Plugin
    eventType: String!
    title: String!
    description: String!
    payload: JSON!
    severity: Severity!
    createdAt: String!
  }

  """Paginated wrapper for event queries."""
  type PaginatedEvents {
    items: [Event!]!
    total: Int!
  }

  """A design-layer page (kept named "dashboard" for broadcast/live compatibility)."""
  type Dashboard {
    id: ID!
    name: String!
    description: String!
    layout: JSON!
    isDefault: Boolean!
    blocks: [DashboardBlock!]!
    createdAt: String!
    updatedAt: String!
  }

  """A component instance placed on a page. Slots hold cross-source bindings."""
  type DashboardBlock {
    id: ID!
    dashboardId: String!
    componentType: String!
    title: String!
    slots: JSON!
    options: JSON!
    position: JSON!
    size: JSON!
    sortOrder: Int!
  }

  """A notification rule that fires actions on matching events."""
  type NotificationRule {
    id: ID!
    name: String!
    eventPattern: String!
    conditions: JSON!
    actions: JSON!
    enabled: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  """A public broadcast link that exposes dashboards without authentication."""
  type BroadcastLink {
    id: ID!
    token: String!
    name: String!
    enabled: Boolean!
    dashboards: [Dashboard!]!
    createdAt: String!
    updatedAt: String!
  }

  """A data source available for installation."""
  type AvailablePlugin {
    id: String!
    name: String!
    description: String!
    version: String!
    author: String!
    icon: String
    configFields: [PluginConfigField!]!
    """The source's capability descriptor: { entities, events }."""
    capabilities: JSON!
  }

  """Configuration field descriptor for a data source."""
  type PluginConfigField {
    key: String!
    label: String!
    type: String!
    required: Boolean!
    defaultValue: String
    description: String
  }

  """The queryable capability surface of one installed instance, for bindings."""
  type InstanceCapability {
    instanceId: ID!
    sourceType: String!
    name: String!
    """The source's capability descriptor: { entities, events }."""
    capabilities: JSON!
  }

  """Input for querying events with filters."""
  input EventFilterInput {
    pluginInstanceId: String
    eventType: String
    severity: Severity
    after: String
    before: String
    limit: Int
    offset: Int
  }

  """Input for a component block on a page."""
  input BlockInput {
    componentType: String!
    title: String
    slots: JSON
    options: JSON
    position: JSON
    size: JSON
    sortOrder: Int
  }

  """Input for creating a dashboard."""
  input CreateDashboardInput {
    name: String!
    description: String
    layout: JSON
    isDefault: Boolean
    blocks: [BlockInput!]
  }

  """Input for updating a dashboard."""
  input UpdateDashboardInput {
    name: String
    description: String
    layout: JSON
    isDefault: Boolean
    blocks: [BlockInput!]
  }

  """Input for installing a data-source instance."""
  input InstallPluginInput {
    pluginId: String!
    name: String!
    config: JSON
  }

  """Input for configuring a data-source instance."""
  input ConfigurePluginInput {
    config: JSON!
  }

  """Input for creating a notification rule."""
  input CreateNotificationRuleInput {
    name: String!
    eventPattern: String!
    conditions: JSON
    actions: JSON!
    enabled: Boolean
  }

  """Input for updating a notification rule."""
  input UpdateNotificationRuleInput {
    name: String
    eventPattern: String
    conditions: JSON
    actions: JSON
    enabled: Boolean
  }

  """Input for creating a broadcast link."""
  input CreateBroadcastLinkInput {
    name: String!
    dashboardIds: [ID!]!
  }

  """Input for updating a broadcast link."""
  input UpdateBroadcastLinkInput {
    name: String
    enabled: Boolean
    dashboardIds: [ID!]
  }

  """Runtime server configuration exposed to the client."""
  type ServerConfig {
    """Public base URL external services use for webhooks (null until resolved)."""
    webhookBaseUrl: String
  }

  type Query {
    """Public, no-auth server configuration (e.g. the resolved webhook base URL)."""
    serverConfig: ServerConfig!

    """Retrieve paginated and filtered events."""
    events(filter: EventFilterInput): PaginatedEvents!

    """List all installed data-source instances."""
    plugins: [Plugin!]!

    """
    The queryable capability surface of every enabled instance. Drives the
    binding picker: each entry is { instanceId, sourceType, name, capabilities }.
    """
    sourceCapabilities: [InstanceCapability!]!

    """
    Resolve an array of bindings to shaped values (scalar/series/list). Input is
    a JSON array of Binding objects; returns a JSON array of ResolvedBinding.

    Authenticated callers may resolve any binding. Unauthenticated callers (the
    public TV view) must pass broadcastToken, and may then only resolve the
    bindings declared by that broadcast's own blocks.
    """
    resolveBindings(bindings: JSON!, broadcastToken: String): JSON!

    """
    List the projects/repositories a data-source instance can monitor, with a
    flag indicating whether the Eventium webhook is currently installed on each.
    """
    webhookTargets(pluginInstanceId: ID!, webhookUrl: String!): JSON

    """List all available data-source definitions (from registry)."""
    availablePlugins: [AvailablePlugin!]!

    """List all dashboards."""
    dashboards: [Dashboard!]!

    """Retrieve a single dashboard by ID."""
    dashboard(id: ID!): Dashboard

    """Export a page to a portable, instance-agnostic PageSpec (JSON)."""
    exportPage(id: ID!): JSON!

    """List all notification rules."""
    notificationRules: [NotificationRule!]!

    """Retrieve a single notification rule by ID."""
    notificationRule(id: ID!): NotificationRule

    """List all broadcast links owned by the authenticated user."""
    broadcastLinks: [BroadcastLink!]!

    """Retrieve a broadcast link by its public token (no auth required)."""
    broadcastLink(token: String!): BroadcastLink
  }

  type Mutation {
    """Create a new dashboard."""
    createDashboard(input: CreateDashboardInput!): Dashboard!

    """Update an existing dashboard."""
    updateDashboard(id: ID!, input: UpdateDashboardInput!): Dashboard!

    """Delete a dashboard."""
    deleteDashboard(id: ID!): Dashboard!

    """Import a portable PageSpec, mapping each source type to a local instance."""
    importPage(spec: JSON!, sourceMapping: JSON!): Dashboard!

    """Install a new data-source instance."""
    installPlugin(input: InstallPluginInput!): Plugin!

    """Uninstall (remove) a data-source instance."""
    uninstallPlugin(id: ID!): Plugin!

    """Update data-source instance configuration."""
    configurePlugin(id: ID!, input: ConfigurePluginInput!): Plugin!

    """Toggle a data-source instance on or off."""
    togglePlugin(id: ID!, enabled: Boolean!): Plugin!

    """Sync metadata from the data source's external API."""
    syncPluginMetadata(id: ID!): Plugin!

    """
    Register/unregister the Eventium webhook on the given targets so the
    monitored set matches the given targetIds. Returns the refreshed targets list.
    """
    syncWebhookTargets(pluginInstanceId: ID!, targetIds: [String!]!, webhookUrl: String!): JSON

    """Create a new notification rule."""
    createNotificationRule(input: CreateNotificationRuleInput!): NotificationRule!

    """Update an existing notification rule."""
    updateNotificationRule(id: ID!, input: UpdateNotificationRuleInput!): NotificationRule!

    """Delete a notification rule."""
    deleteNotificationRule(id: ID!): NotificationRule!

    """Create a new broadcast link."""
    createBroadcastLink(input: CreateBroadcastLinkInput!): BroadcastLink!

    """Update an existing broadcast link."""
    updateBroadcastLink(id: ID!, input: UpdateBroadcastLinkInput!): BroadcastLink!

    """Delete a broadcast link."""
    deleteBroadcastLink(id: ID!): BroadcastLink!

    """Regenerate the public token for a broadcast link."""
    regenerateBroadcastLinkToken(id: ID!): BroadcastLink!
  }

  type Subscription {
    """Subscribe to real-time events (optionally scoped to a data-source instance)."""
    onEvent(pluginInstanceId: String): Event!
  }

  """Arbitrary JSON scalar."""
  scalar JSON
`;
