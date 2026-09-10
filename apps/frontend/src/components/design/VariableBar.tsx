/**
 * @fileoverview Variable bar — define/edit runtime dashboard variables.
 * Panels reference these as `$name` in their binding params; changing a value
 * here re-parametrizes every panel that uses it. Freedom-first value inputs.
 */
import { useState } from 'react';
import { FreedomField } from '@/components/ui/FreedomField';
import { useVariablesStore } from '@/storage/variables.store';

const inputClass =
  'rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40';

/** The dashboard variable bar. */
export function VariableBar() {
  const variables = useVariablesStore((s) => s.variables);
  const setVariable = useVariablesStore((s) => s.setVariable);
  const removeVariable = useVariablesStore((s) => s.removeVariable);
  const [newName, setNewName] = useState('');
  const entries = Object.entries(variables);

  const add = () => {
    const name = newName.trim().replace(/^\$/, '');
    if (!name) return;
    setVariable(name, variables[name] ?? '');
    setNewName('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] p-2">
      <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
        Değişkenler
      </span>
      {entries.length === 0 && (
        <span className="text-xs text-[var(--color-text-tertiary)]">
          Yok — panel parametrelerinde <span className="font-mono text-brand-500">$ad</span> ile
          kullan
        </span>
      )}
      {entries.map(([name, value]) => (
        <div
          key={name}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1"
        >
          <span className="font-mono text-xs text-brand-500">${name}</span>
          <span className="text-[var(--color-text-tertiary)]">=</span>
          <div className="w-40">
            <FreedomField
              value={value}
              onChange={(v) => setVariable(name, v)}
              placeholder="değer"
            />
          </div>
          <button
            type="button"
            onClick={() => removeVariable(name)}
            aria-label={`${name} sil`}
            className="text-[var(--color-text-tertiary)] hover:text-red-500 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M9 3L3 9M3 3l6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          placeholder="+ değişken adı"
          className={`w-32 ${inputClass}`}
        />
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Ekle
        </button>
      </div>
    </div>
  );
}
