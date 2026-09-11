/**
 * @fileoverview Runtime dashboard variables.
 *
 * The dynamism core: viewers/builders define named variables (e.g. `project`)
 * and any binding param can reference one as `$project`. Before a binding is
 * resolved, {@link applyVariables} substitutes the current values, so a single
 * board re-parametrizes live from the variable bar. Persisted across reloads.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Binding } from '@/types';

interface VariablesState {
  /** name → value. */
  variables: Record<string, string>;
  setVariable: (name: string, value: string) => void;
  removeVariable: (name: string) => void;
  /** Replaces the entire variable set (used when a page is loaded/switched). */
  setAll: (variables: Record<string, string>) => void;
}

/** Global variables store. */
export const useVariablesStore = create<VariablesState>()(
  persist(
    (set) => ({
      variables: {},
      setVariable: (name, value) => set((s) => ({ variables: { ...s.variables, [name]: value } })),
      removeVariable: (name) =>
        set((s) => {
          const next = { ...s.variables };
          delete next[name];
          return { variables: next };
        }),
      setAll: (variables) => set({ variables: { ...variables } }),
    }),
    { name: 'eventium-variables' },
  ),
);

/**
 * Extracts the `name → value` variable map persisted in a page's `layout` blob.
 * Tolerant of missing/malformed data — always returns a clean string map.
 */
export function readLayoutVariables(layout: unknown): Record<string, string> {
  if (!layout || typeof layout !== 'object') return {};
  const raw = (layout as { variables?: unknown }).variables;
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

/**
 * Substitute `$name` param values with the current variable values.
 * Returns the same binding object when nothing referenced a variable.
 */
export function applyVariables(binding: Binding, variables: Record<string, string>): Binding {
  if (!binding.params) return binding;
  let changed = false;
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(binding.params)) {
    if (typeof value === 'string' && value.startsWith('$')) {
      const name = value.slice(1);
      if (name in variables) {
        params[key] = variables[name];
        changed = true;
        continue;
      }
    }
    params[key] = value;
  }
  return changed ? { ...binding, params } : binding;
}
