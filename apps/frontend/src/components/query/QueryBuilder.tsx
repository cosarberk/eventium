/**
 * @fileoverview Freedom-first Query Builder (Faz 1).
 *
 * A platform TOOL (overlay, not a fixed page). It introspects installed plugins
 * ("xxx kaynağından şu entity'ler / şu alanlar geliyor"), lets the user compose
 * a query with zero constraints — pick fields, set params via FreedomField
 * (select + elle yaz + id/isim), limit — and previews live results through the
 * existing resolveBindings API. Output is a portable Binding[] spec.
 */
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { FreedomField } from '@/components/ui/FreedomField';
import { useSourceCapabilities } from '@/hooks/useSourceCapabilities';
import { resolveBindings } from '@/services/binding.service';
import type { Binding } from '@/types';

/* ── Introspection shapes (capabilities JSON) ─────────────── */
interface CapField {
  key: string;
  label: string;
  type?: { kind?: string };
}
interface CapParam {
  key: string;
  label: string;
  required?: boolean;
}
interface CapEntity {
  key: string;
  label: string;
  description?: string;
  fields: CapField[];
  params?: CapParam[];
}
interface Caps {
  entities?: CapEntity[];
}

const box = 'rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)]';
const inputClass =
  'w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors';

/** The builder body. */
function Builder() {
  const { capabilities } = useSourceCapabilities();
  const instances = capabilities ?? [];

  const [instanceId, setInstanceId] = useState('');
  const active = instances.find((i) => i.instanceId === instanceId) ?? instances[0];
  const sourceType = active?.sourceType ?? '';
  const entities = ((active?.capabilities as Caps | undefined)?.entities ?? []) as CapEntity[];

  const [entityKey, setEntityKey] = useState('');
  const entity = entities.find((e) => e.key === entityKey) ?? entities[0];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [params, setParams] = useState<Record<string, string>>({});
  const [limit, setLimit] = useState(25);

  // Reset field/param selection when entity changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on entity switch
  useEffect(() => {
    setSelected(new Set());
    setParams({});
  }, [entity?.key, active?.instanceId]);

  const fields = entity?.fields ?? [];
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selectedList = fields.filter((f) => selected.has(f.key));

  const bindings = useMemo<Binding[]>(() => {
    if (!active || !entity) return [];
    const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''));
    return selectedList.map(
      (f) =>
        ({
          ref: `${sourceType}:${entity.key}.${f.key}`,
          instanceId: active.instanceId,
          params: cleanParams,
          limit,
        }) as Binding,
    );
  }, [active, entity, selectedList, params, limit, sourceType]);

  const {
    data: rows,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['qb', active?.instanceId, entity?.key, [...selected], params, limit],
    enabled: bindings.length > 0,
    queryFn: async (): Promise<string[][]> => {
      const resolved = await resolveBindings(bindings);
      const lists = resolved.map((r) => r.list ?? []);
      const rowCount = lists.reduce((m, l) => Math.max(m, l.length), 0);
      const out: string[][] = [];
      for (let r = 0; r < rowCount; r++) {
        out.push(lists.map((l) => (l[r] == null ? '' : String(l[r]))));
      }
      return out;
    },
  });

  if (instances.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-tertiary)] p-6 text-center">
        Kurulu veri kaynağı yok. Önce Plugins'ten bir kaynak kur.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-full">
      {/* Config */}
      <div className="space-y-4 overflow-y-auto pr-1">
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-[var(--color-text-secondary)]">
            Kaynak
          </span>
          <select
            value={active?.instanceId ?? ''}
            onChange={(e) => {
              setInstanceId(e.target.value);
              setEntityKey('');
            }}
            className={inputClass}
          >
            {instances.map((i) => (
              <option key={i.instanceId} value={i.instanceId}>
                {i.name} · {i.sourceType}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-[var(--color-text-secondary)]">
            Entity
          </span>
          <select
            value={entity?.key ?? ''}
            onChange={(e) => setEntityKey(e.target.value)}
            className={inputClass}
          >
            {entities.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </select>
          {entity?.description && (
            <p className="text-[11px] text-[var(--color-text-tertiary)]">{entity.description}</p>
          )}
        </div>

        {/* Params — freedom-first */}
        {(entity?.params ?? []).length > 0 && (
          <div className={`${box} p-3 space-y-3`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Parametreler
            </p>
            {(entity?.params ?? []).map((p) => (
              <div key={p.key} className="space-y-1.5">
                <span className="block text-xs text-[var(--color-text-secondary)]">
                  {p.label}
                  {p.required && <span className="text-red-500"> *</span>}
                </span>
                <FreedomField
                  value={params[p.key] ?? ''}
                  onChange={(v) => setParams((prev) => ({ ...prev, [p.key]: v }))}
                  placeholder={`${p.label} — seç ya da elle yaz ($değişken de olur)`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Fields */}
        <div className={`${box} p-3 space-y-2`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
            Alanlar
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {fields.map((f) => (
              <label
                key={f.key}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--color-surface-hover)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(f.key)}
                  onChange={() => toggle(f.key)}
                  className="accent-brand-500"
                />
                <span className="text-sm text-[var(--color-text-primary)]">{f.label}</span>
                <span className="ml-auto text-[10px] text-[var(--color-text-tertiary)] font-mono">
                  {f.key}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-[var(--color-text-secondary)]">
            Limit
          </span>
          <input
            type="number"
            min={1}
            max={1000}
            value={limit}
            onChange={(e) => setLimit(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
            className={inputClass}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="flex flex-col min-h-0 gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            Önizleme {isFetching && '· yükleniyor…'}
          </p>
          <p className="text-[11px] text-[var(--color-text-tertiary)] font-mono truncate max-w-[60%]">
            {sourceType}:{entity?.key} · {selectedList.length} alan
          </p>
        </div>
        <div className={`${box} flex-1 overflow-auto min-h-[240px]`}>
          {error ? (
            <p className="p-4 text-sm text-red-500">{(error as Error).message}</p>
          ) : selectedList.length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-text-tertiary)] text-center">
              Soldan alan seç → veriyi burada gör.
            </p>
          ) : !rows || rows.length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-text-tertiary)] text-center">Sonuç yok.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-bg-elevated)]">
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  {selectedList.map((f) => (
                    <th key={f.key} className="px-3 py-2 font-medium">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional rows
                  <tr key={r} className="border-t border-[var(--color-border-primary)]">
                    {row.map((cell, c) => (
                      <td
                        key={selectedList[c]?.key ?? c}
                        className="px-3 py-2 text-[var(--color-text-secondary)] align-top"
                      >
                        <span className="line-clamp-2">{cell}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* Generated spec */}
        <details className={`${box} p-3`}>
          <summary className="text-xs text-[var(--color-text-secondary)] cursor-pointer">
            Query spec (Binding[])
          </summary>
          <pre className="mt-2 text-[11px] text-[var(--color-text-tertiary)] overflow-auto max-h-40 font-mono">
            {JSON.stringify(bindings, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

/** Overlay host — opens on the `eventium:query-builder` window event. */
export function QueryBuilderOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('eventium:query-builder', onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('eventium:query-builder', onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="relative w-full max-w-5xl h-[80vh] flex flex-col rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] shadow-xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center justify-between px-4 h-header border-b border-[var(--color-border-primary)] shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Query Builder
                </h2>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                  Kaynağın verisini seç, parametrele, önizle — kısıt yok.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 p-4">
              <Builder />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
