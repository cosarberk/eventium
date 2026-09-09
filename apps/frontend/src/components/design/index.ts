/**
 * @fileoverview Barrel export for the design layer's render + editor components.
 */

export { BindingPicker } from './BindingPicker';
export { BlockGrid } from './BlockGrid';
export { BlockInspector } from './BlockInspector';
export { BlockRenderer } from './BlockRenderer';
export { getComponent, listComponentDescriptors, registerComponent } from './registry';
export type {
  BlockData,
  ComponentRenderer,
  ComponentRenderProps,
  ResolvedSlotValue,
} from './render-types';
