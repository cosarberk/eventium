/**
 * @fileoverview Barrel export for all shared type definitions.
 */

export type {
  Aggregation,
  Binding,
  BindingFilter,
  BindingShape,
  CompareOp,
  FieldRef,
  ResolvedBinding,
} from './binding.js';
export { formatFieldRef, isValidFieldRef, parseFieldRef } from './binding.js';
export type {
  ComponentDescriptor,
  ComponentOption,
  ComponentOptionType,
  SlotDescriptor,
} from './component.js';
export type {
  CapabilityDescriptor,
  EntityDescriptor,
  EntityParam,
  FieldDescriptor,
  ResourceQuery,
  ResourceResult,
  StreamEventDescriptor,
} from './data-source.js';
export type { EmittedEvent, EventSeverity, PlatformEvent } from './event.js';
export type { FieldType, FieldTypeKind } from './field-type.js';
export { isNumericFieldType, isTemporalFieldType } from './field-type.js';
export type {
  ConditionOperator,
  Notification,
  NotificationAction,
  NotificationChannel,
  NotificationCondition,
  NotificationRule,
  NotificationStatus,
} from './notification.js';
export type {
  BlockPosition,
  BlockSize,
  BlockSlot,
  BoundValue,
  ColorRule,
  Page,
  PageBlock,
  PageSpec,
  ValueFormat,
} from './page.js';
export type {
  PanelBadge,
  PanelCell,
  PanelColumn,
  PanelSeries,
  PanelSeriesPoint,
  PanelSeverity,
  PanelStat,
  PanelTimelineItem,
} from './panel-view.js';
