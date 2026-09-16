/**
 * @fileoverview Frontend type definitions.
 *
 * Design-layer contracts (bindings, blocks, components, capabilities) come from
 * `@eventium/shared`; this file adds the frontend-facing GraphQL entity shapes.
 */

// ── Design-layer contracts (single source of truth: @eventium/shared) ──────────
export type {
  Aggregation,
  Binding,
  BindingFilter,
  BindingShape,
  BlockSlot,
  BoundValue,
  CapabilityDescriptor,
  ColorRule,
  CompareOp,
  ComponentDescriptor,
  ComponentOption,
  EntityDescriptor,
  EntityParam,
  FieldDescriptor,
  FieldType,
  FieldTypeKind,
  Page,
  PageBlock,
  PageSpec,
  PanelBadge,
  PanelCell,
  PanelColumn,
  PanelSeries,
  PanelSeriesPoint,
  PanelSeverity,
  PanelStat,
  PanelTimelineItem,
  ResolvedBinding,
  SlotDescriptor,
  StreamEventDescriptor,
  ValueFormat,
} from '@eventium/shared';
// ── Design-layer helpers (runtime, single source of truth: @eventium/shared) ───
export { formatFieldRef, isValidFieldRef, parseFieldRef } from '@eventium/shared';

/** Severity levels matching backend enum. */
export type Severity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/** Connection status for WebSocket/Socket.io. */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

/** Theme mode. */
export type ThemeMode = 'light' | 'dark';

/** Unique identifier type. */
export type ID = string;

/** A data-source instance installed on the platform. */
export interface Plugin {
  id: ID;
  pluginId: string;
  name: string;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  enabled: boolean;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A data source available for installation, with its capability descriptor. */
export interface AvailablePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon?: string;
  configFields: PluginConfigField[];
  capabilities: import('@eventium/shared').CapabilityDescriptor;
}

/** Configuration field descriptor for a data source. */
export interface PluginConfigField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

/** The queryable capability surface of one installed instance, for bindings. */
export interface InstanceCapability {
  instanceId: ID;
  sourceType: string;
  name: string;
  capabilities: import('@eventium/shared').CapabilityDescriptor;
}

/** An event produced by a data-source instance. */
export interface EventItem {
  id: ID;
  pluginInstanceId: string;
  sourceType?: string;
  pluginInstance?: Plugin;
  eventType: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  severity: Severity;
  createdAt: string;
}

/** Paginated events response. */
export interface PaginatedEvents {
  items: EventItem[];
  total: number;
}

/** A component block placed on a page (design-layer). */
export interface DashboardBlock {
  id: ID;
  componentType: string;
  title: string;
  slots: Record<string, import('@eventium/shared').BlockSlot>;
  options: Record<string, unknown>;
  position: { x: number; y: number };
  size: { w: number; h: number };
  sortOrder: number;
}

/** A design-layer page (named "dashboard" for broadcast/live compatibility). */
export interface Dashboard {
  id: ID;
  name: string;
  description: string;
  layout: Record<string, unknown>;
  isDefault: boolean;
  /** Owning project id (present once migrated to the project model). */
  projectId?: string | null;
  /** Order of this page within its project. */
  pageOrder?: number;
  blocks: DashboardBlock[];
  createdAt: string;
  updatedAt: string;
}

/** A node in a project's file-system tree — a folder or a typed file. */
export interface ProjectNode {
  id: ID;
  projectId: string;
  parentId?: string | null;
  /** folder | page | blueprint | datasource | script | component | variables | theme | … */
  kind: string;
  name: string;
  order: number;
  /** For a `page` node: the Dashboard it opens. */
  refId?: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** A project — the top-level unit that owns pages, like a VS solution. */
export interface Project {
  id: ID;
  name: string;
  /** Project-type id (dashboard/site/app/report/blank). */
  type: string;
  description: string;
  /** The project's pages, ordered by `pageOrder`. */
  pages: Dashboard[];
  createdAt: string;
  updatedAt: string;
}

/** Notification rule for event matching and actions. */
export interface NotificationRule {
  id: ID;
  name: string;
  eventPattern: string;
  conditions: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Broadcast link for sharing dashboards publicly. */
export interface BroadcastLink {
  id: ID;
  token: string;
  name: string;
  enabled: boolean;
  dashboards: Dashboard[];
  createdAt: string;
  updatedAt: string;
}

/** Authenticated user profile. */
export interface User {
  id: ID;
  email: string;
  name: string;
  role: string;
  /** When true, the app forces a password change before anything else. */
  mustChangePassword?: boolean;
}

/** A monitorable target and whether the Eventium webhook is installed on it. */
export interface WebhookTarget {
  id: string;
  name: string;
  fullPath: string;
  monitored: boolean;
}

/** Filter parameters for event queries. */
export interface EventFilter {
  pluginInstanceId?: string;
  eventType?: string;
  severity?: Severity;
  after?: string;
  before?: string;
  limit?: number;
  offset?: number;
}
