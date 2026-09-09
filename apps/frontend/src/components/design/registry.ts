/**
 * @fileoverview Component registry.
 *
 * The design layer is component-agnostic: it renders whatever is registered
 * here. Adding a component = writing a {@link ComponentRenderer} and calling
 * {@link registerComponent}. The editor's component picker and every renderer
 * dispatch read from this registry — there is no hardcoded component switch.
 */

import type { ComponentDescriptor } from '@/types';
import type { ComponentRenderer } from './render-types';

/** All registered components, keyed by descriptor type. */
const registry = new Map<string, ComponentRenderer>();

/** Register a component renderer. Later registrations override earlier ones. */
export function registerComponent(renderer: ComponentRenderer): void {
  registry.set(renderer.descriptor.type, renderer);
}

/** Look up a component renderer by type. */
export function getComponent(type: string): ComponentRenderer | undefined {
  return registry.get(type);
}

/** Every registered descriptor, for the component picker. */
export function listComponentDescriptors(): ComponentDescriptor[] {
  return Array.from(registry.values(), (r) => r.descriptor);
}
