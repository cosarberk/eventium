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
    }),
    { name: 'eventium-variables' },
  ),
);

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
