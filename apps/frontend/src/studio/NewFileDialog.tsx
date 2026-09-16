/**
 * @fileoverview New File dialog — a Visual Studio / Unreal-style "Add New Item"
 * picker. Lists the project's creatable file types (from the registry) with icon,
 * label, extension and description; you name the file and create it in the tree.
 * Opened by the `eventium:new-file` window event (detail = parent folder id).
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNodes } from '@/hooks/useNodes';
import { fetchProjects } from '@/services/project.service';
import { useDashboardStore } from '@/storage/dashboard.store';
import { listFileTypes } from './file-types';

/** The New File dialog (mounted once; shows on the `eventium:new-file` event). */
export function NewFileDialog() {
  const activeProject = useDashboardStore((s) => s.activeProject);
  const addPage = useDashboardStore((s) => s.addPage);
  const { createNode } = useNodes(activeProject?.id);

  const [open, setOpen] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [kind, setKind] = useState('page');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setParentId(detail || null);
      setKind('page');
      setName('');
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('eventium:new-file', onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('eventium:new-file', onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const types = listFileTypes().filter((t) => t.creatable);

  const create = async () => {
    if (!activeProject || !name.trim() || busy) return;
    setBusy(true);
    try {
      const node = await createNode({
        projectId: activeProject.id,
        parentId,
        kind,
        name: name.trim(),
      });
      toast.success('Dosya oluşturuldu');
      setOpen(false);
      // Opening a fresh page needs the project's pages refreshed first.
      if (kind === 'page' && node.refId) {
        const projects = await fetchProjects();
        const page = projects
          .find((p) => p.id === activeProject.id)
          ?.pages.find((p) => p.id === node.refId);
        if (page) addPage(page);
      }
    } catch (err) {
      toast.error(`Oluşturulamadı: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Kapat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[var(--color-bg-overlay)] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] shadow-xl"
          >
            <div className="border-b border-[var(--color-border-primary)] px-5 py-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Yeni dosya</h2>
              <p className="text-[11px] text-[var(--color-text-tertiary)]">
                {activeProject?.name}
                {parentId ? ' · bir klasörün içine' : ' · projenin köküne'}
              </p>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-auto p-4 sm:grid-cols-2">
              {types.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => setKind(t.kind)}
                  style={{ '--type-accent': t.accent } as React.CSSProperties}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    kind === t.kind
                      ? 'border-[var(--type-accent)] bg-[var(--color-surface-hover)]'
                      : 'border-[var(--color-border-primary)] hover:border-[var(--type-accent)]'
                  }`}
                >
                  <span className="text-xl leading-none">{t.icon}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                        {t.label}
                      </span>
                      <span
                        className="rounded px-1 py-0.5 font-mono text-[9px] font-bold text-white"
                        style={{ backgroundColor: t.accent }}
                      >
                        .{t.extension}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[var(--color-text-tertiary)]">
                      {t.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-[var(--color-border-primary)] px-5 py-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && create()}
                placeholder="Dosya adı"
                className="flex-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-brand-500/40"
                // biome-ignore lint/a11y/noAutofocus: primary field of a freshly opened dialog
                autoFocus
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-[var(--color-bg-tertiary)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)]"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={create}
                disabled={!name.trim() || busy}
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
              >
                {busy ? 'Oluşturuluyor…' : 'Oluştur'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
