/**
 * @fileoverview Freedom-first field input.
 *
 * Core platform principle: never force one input method. This control lets the
 * user EITHER pick from a searchable list (matched by BOTH id and name) OR type
 * any value by hand (manual) OR reference a `$variable`. Selecting an option
 * stores its id; typing stores the raw text.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

/** One selectable option. */
export interface FreedomOption {
  id: string;
  name: string;
  hint?: string;
}

/** FreedomField props. */
export interface FreedomFieldProps {
  value: string;
  onChange: (value: string) => void;
  options?: FreedomOption[];
  placeholder?: string;
  /** false → list-only (no free text). Default true. */
  manual?: boolean;
  loading?: boolean;
  id?: string;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors';

/** Combobox: pick from a list (id/name search) or type freely. */
export function FreedomField({
  value,
  onChange,
  options = [],
  placeholder = 'Listeden seç ya da elle yaz…',
  manual = true,
  loading = false,
  id,
}: FreedomFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => options.find((o) => o.id === value), [options, value]);
  const display = open ? query : selected ? selected.name : value;

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return options.slice(0, 50);
    return options
      .filter(
        (o) =>
          o.id.toLowerCase().includes(s) ||
          o.name.toLowerCase().includes(s) ||
          o.hint?.toLowerCase().includes(s),
      )
      .slice(0, 50);
  }, [query, options]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (opt: FreedomOption) => {
    onChange(opt.id);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        value={display}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (manual) onChange(e.target.value);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClass}
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">Yükleniyor…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--color-text-tertiary)]">
              {manual ? 'Eşleşme yok — elle yazabilirsin' : 'Eşleşme yok'}
            </p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => pick(o)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-hover)] ${
                  o.id === value ? 'text-brand-500' : 'text-[var(--color-text-secondary)]'
                }`}
              >
                <span className="truncate">
                  {o.name}
                  {o.hint && (
                    <span className="ml-2 text-[11px] text-[var(--color-text-tertiary)]">
                      {o.hint}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] text-[var(--color-text-tertiary)] font-mono">
                  {o.id}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
