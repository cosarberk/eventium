/**
 * @fileoverview Studio canvas editor.
 *
 * The user drags components from the {@link Palette} (focused by the project's
 * type) onto the canvas, or clicks to append. The canvas honours the project's
 * layout mode — `free` lets blocks sit anywhere (desktop-app feel), `grid` packs
 * them. Blocks render through the design registry via {@link BlockGrid},
 * identical to the live/TV views. Selecting a block opens the
 * {@link BlockInspector}. Layout, content and variables persist on save.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { BlockGrid } from '@/components/design/BlockGrid';
import { PageShareControls } from '@/components/design/PageShareControls';
import { useDashboard } from '@/hooks/useDashboard';
import { useSeedPageVariables } from '@/hooks/usePageVariables';
import { useDashboardStore } from '@/storage/dashboard.store';
import { useUIStore } from '@/storage/ui.store';
import { ComponentEditorPane } from '@/studio/ComponentEditorPane';
import { FreeCanvas } from '@/studio/FreeCanvas';
import { Palette } from '@/studio/Palette';
import { readProjectTypeId } from '@/studio/project';
import { getProjectType } from '@/studio/project-types';
// Side-effect: ensure components are registered before listing them.
import '@/components/design/components';

/** Main page builder. */
export function DashboardPage() {
  const {
    activeDashboard,
    isEditMode,
    isLoading,
    dashboards,
    setDashboards,
    setActiveDashboard,
    toggleEditMode,
    removeBlock,
    updateBlockLayout,
    createDashboard,
    deleteDashboard: deleteDashboardMutation,
    updateDashboard: updateDashboardMutation,
    saveLayout,
    isCreating,
  } = useDashboard();

  const addBlock = useDashboardStore((s) => s.addBlock);
  const addBlockWithFrame = useDashboardStore((s) => s.addBlockWithFrame);
  const selectBlock = useDashboardStore((s) => s.selectBlock);
  const selectedBlockId = useDashboardStore((s) => s.selectedBlockId);
  const undo = useDashboardStore((s) => s.undo);
  const redo = useDashboardStore((s) => s.redo);
  const canUndo = useDashboardStore((s) => s.past.length > 0);
  const canRedo = useDashboardStore((s) => s.future.length > 0);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  /** Component code/blueprint editors open as document tabs (VS-style). */
  const [editorTabs, setEditorTabs] = useState<string[]>([]);
  /** Active document view: 'canvas' or a block id whose editor tab is open. */
  const [activeView, setActiveView] = useState<string>('canvas');

  /** Canvas layout mode from the active project's type (grid/free/flow). */
  const layoutMode =
    getProjectType(readProjectTypeId(activeDashboard?.layout))?.layoutMode ?? 'grid';

  /** Sync server pages into the store. */
  useEffect(() => {
    if (dashboards.length > 0) {
      setDashboards(dashboards);
    }
  }, [dashboards, setDashboards]);

  // Load the page's persisted runtime variables when the active page changes.
  useSeedPageVariables(activeDashboard?.id, activeDashboard?.layout);

  const blocks = useMemo(() => activeDashboard?.blocks ?? [], [activeDashboard]);
  // Only keep editor tabs whose block still exists.
  const openTabs = editorTabs.filter((id) => blocks.some((b) => b.id === id));
  const activeEditorBlock =
    activeView !== 'canvas' ? (blocks.find((b) => b.id === activeView) ?? null) : null;

  /** Open (or focus) a component's editor as a document tab. */
  const openEditor = (id: string) => {
    setEditorTabs((t) => (t.includes(id) ? t : [...t, id]));
    setActiveView(id);
  };
  /** Close an editor tab; fall back to the canvas when it was active. */
  const closeEditor = (id: string) => {
    setEditorTabs((t) => t.filter((x) => x !== id));
    setActiveView((v) => (v === id ? 'canvas' : v));
  };

  /** Leaving edit mode clears the selection + closes all editor tabs. */
  useEffect(() => {
    if (!isEditMode) {
      selectBlock(null);
      setEditorTabs([]);
      setActiveView('canvas');
    }
  }, [isEditMode, selectBlock]);

  /** Undo/redo keyboard shortcuts (edit mode; ignored while typing in a field). */
  useEffect(() => {
    if (!isEditMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEditMode, undo, redo]);

  /** Saves the current layout/content and exits edit mode. */
  const handleSave = () => {
    saveLayout();
    toggleEditMode();
    toast.success('Sayfa kaydedildi');
  };

  /** Begins renaming the active page. */
  const startRename = () => {
    if (!activeDashboard) return;
    setRenameValue(activeDashboard.name);
    setRenaming(true);
  };

  /** Commits the rename. */
  const commitRename = () => {
    if (!activeDashboard || !renameValue.trim()) return;
    updateDashboardMutation(
      { id: activeDashboard.id, input: { name: renameValue.trim() } },
      {
        onSuccess: () => {
          toast.success('Sayfa yeniden adlandırıldı');
          setRenaming(false);
        },
      },
    );
  };

  /** Deletes the active page. */
  const handleDelete = () => {
    if (!activeDashboard) return;
    if (!window.confirm(`"${activeDashboard.name}" silinsin mi? Bu geri alınamaz.`)) return;
    deleteDashboardMutation(activeDashboard.id, {
      onSuccess: () => toast.success('Sayfa silindi'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  if (dashboards.length === 0) {
    return (
      <>
        <FirstDashboardOnboarding onCreate={() => setShowCreateModal(true)} />
        <AnimatePresence>
          {showCreateModal && (
            <CreateDashboardModal
              isCreating={isCreating}
              onClose={() => setShowCreateModal(false)}
              onCreate={(name) =>
                createDashboard(
                  { name, isDefault: true },
                  {
                    onSuccess: () => {
                      toast.success('Sayfa oluşturuldu');
                      setShowCreateModal(false);
                    },
                  },
                )
              }
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {renaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setRenaming(false);
              }}
              onBlur={commitRename}
              className="text-lg font-semibold text-[var(--color-text-primary)] bg-transparent border-b-2 border-brand-500 outline-none px-1"
              // biome-ignore lint/a11y/noAutofocus: rename field should focus immediately
              autoFocus
            />
          ) : (
            <select
              value={activeDashboard?.id ?? ''}
              onChange={(e) => {
                const d = dashboards.find((db) => db.id === e.target.value);
                if (d) setActiveDashboard(d);
              }}
              className="text-lg font-semibold text-[var(--color-text-primary)] bg-transparent border-none outline-none cursor-pointer appearance-none pr-6"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right center',
              }}
            >
              {dashboards.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 ml-1">
            <IconButton title="New page" onClick={() => setShowCreateModal(true)}>
              <path
                d="M7 2v10M2 7h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </IconButton>
            {isEditMode && (
              <>
                <IconButton title="Rename page" onClick={startRename}>
                  <path
                    d="M10 1.5l2.5 2.5L4 12.5H1.5V10L10 1.5z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </IconButton>
                <IconButton title="Delete page" danger onClick={handleDelete}>
                  <path
                    d="M2 3.5h10M5 3.5V2a1 1 0 011-1h2a1 1 0 011 1v1.5M11 3.5v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </IconButton>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && (
            <>
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                title="Geri al (⌘Z)"
                aria-label="Geri al"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M6 4L3 7l3 3M3 7h7a3 3 0 010 6H8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                title="Yinele (⌘⇧Z)"
                aria-label="Yinele"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M10 4l3 3-3 3M13 7H6a3 3 0 000 6h2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
              >
                Kaydet
              </button>
            </>
          )}
          {activeDashboard && <PageShareControls dashboardId={activeDashboard.id} />}
          <button
            type="button"
            onClick={toggleEditMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isEditMode
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {isEditMode ? 'Bitir' : 'Düzenle'}
          </button>
        </div>
      </div>

      {/* Document area — canvas + per-component code/blueprint editor tabs */}
      {!isEditMode && blocks.length === 0 ? (
        <EmptyState
          title="Boş sayfa"
          description='Düzenlemek ve bileşen eklemek için "Düzenle".'
          className="h-[50vh]"
        />
      ) : (
        <div className="space-y-2">
          {/* Document tab bar (VS-style) — appears once an editor is open */}
          {isEditMode && openTabs.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--color-border-primary)] pb-px">
              <DocTab active={activeView === 'canvas'} onClick={() => setActiveView('canvas')}>
                ◇ Canvas
              </DocTab>
              {openTabs.map((id) => {
                const b = blocks.find((x) => x.id === id);
                return (
                  <DocTab
                    key={id}
                    active={activeView === id}
                    onClick={() => setActiveView(id)}
                    onClose={() => closeEditor(id)}
                  >
                    {'</> '}
                    {b?.title || b?.componentType}
                  </DocTab>
                );
              })}
            </div>
          )}

          {activeEditorBlock ? (
            /* Full-width component editor (code / blueprint) */
            <div className="flex">
              <ComponentEditorPane
                block={activeEditorBlock}
                onClose={() => closeEditor(activeEditorBlock.id)}
              />
            </div>
          ) : (
            /* Canvas view: palette + surface (free viewport or grid artboard) */
            <div className="flex gap-4">
              {isEditMode && <Palette />}
              <div className="min-w-0 flex-1">
                {layoutMode === 'free' ? (
                  <FreeCanvas
                    blocks={blocks}
                    editing={isEditMode}
                    selectedId={selectedBlockId}
                    onSelect={(id) => {
                      selectBlock(id);
                      if (id) setInspectorOpen(true);
                    }}
                    onOpenEditor={(id) => {
                      selectBlock(id);
                      openEditor(id);
                    }}
                    onRemove={removeBlock}
                    onConfigure={(id) => {
                      selectBlock(id);
                      setInspectorOpen(true);
                    }}
                    onAddAt={(type, x, y) => {
                      addBlockWithFrame(type, { x, y });
                      setInspectorOpen(true);
                    }}
                  />
                ) : (
                  <div className="relative rounded-xl bg-[var(--color-bg-secondary)] p-2 ring-1 ring-inset ring-[var(--color-border-primary)] [background-image:radial-gradient(var(--color-border-primary)_1px,transparent_1px)] [background-size:16px_16px]">
                    <BlockGrid
                      blocks={blocks}
                      editing={isEditMode}
                      layoutMode={layoutMode}
                      selectedId={selectedBlockId}
                      onExternalDrop={(type, at) => {
                        addBlock(type, at);
                        setInspectorOpen(true);
                      }}
                      onSelectBlock={(id) => {
                        selectBlock(id);
                        setInspectorOpen(true);
                      }}
                      onOpenBlockEditor={(id) => {
                        selectBlock(id);
                        openEditor(id);
                      }}
                      onLayoutChange={updateBlockLayout}
                      onRemoveBlock={removeBlock}
                      onConfigureBlock={(id) => {
                        selectBlock(id);
                        setInspectorOpen(true);
                      }}
                    />
                    {isEditMode && blocks.length === 0 && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[420px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border-secondary)] text-center">
                        <span className="text-3xl opacity-40">⬚</span>
                        <p className="max-w-xs text-sm text-[var(--color-text-tertiary)]">
                          Paletten bir bileşeni buraya <b>sürükle-bırak</b>. Çift tık →
                          kod/blueprint.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create page modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateDashboardModal
            isCreating={isCreating}
            onClose={() => setShowCreateModal(false)}
            onCreate={(name) =>
              createDashboard(
                { name },
                {
                  onSuccess: () => {
                    toast.success('Sayfa oluşturuldu');
                    setShowCreateModal(false);
                  },
                },
              )
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Small header icon button ──────────────────────────────────────────── */

function IconButton({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] transition-colors ${
        danger ? 'hover:text-red-500' : 'hover:text-[var(--color-text-primary)]'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

/** A document tab (Canvas / a component's code editor). */
function DocTab({
  active,
  onClick,
  onClose,
  children,
}: {
  active: boolean;
  onClick: () => void;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex shrink-0 items-center gap-1.5 rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border border-b-0 border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
      }`}
    >
      <button type="button" onClick={onClick} className="max-w-[180px] truncate">
        {children}
      </button>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Sekmeyi kapat"
          className="text-[var(--color-text-tertiary)] transition-colors hover:text-red-500"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ─── Onboarding ────────────────────────────────────────────────────────── */

function FirstDashboardOnboarding({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect
              x="2"
              y="2"
              width="12"
              height="12"
              rx="3"
              stroke="currentColor"
              strokeWidth="2"
              className="text-brand-500"
            />
            <rect
              x="18"
              y="2"
              width="12"
              height="8"
              rx="3"
              stroke="currentColor"
              strokeWidth="2"
              className="text-brand-400"
            />
            <rect
              x="2"
              y="18"
              width="12"
              height="8"
              rx="3"
              stroke="currentColor"
              strokeWidth="2"
              className="text-brand-400"
            />
            <rect
              x="18"
              y="14"
              width="12"
              height="12"
              rx="3"
              stroke="currentColor"
              strokeWidth="2"
              className="text-brand-500"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">İlk sayfanı oluştur</h1>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-2 max-w-sm">
          Sayfalar; bileşenleri düzenleyip bağlı kaynaklardan gelen veriye gerçek zamanlı bağlaman
          içindir.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all hover:shadow-lg hover:shadow-brand-500/30"
      >
        Sayfa Oluştur
      </button>
    </div>
  );
}

/* ─── Modals ────────────────────────────────────────────────────────────── */

interface CreateDashboardModalProps {
  isCreating: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

function CreateDashboardModal({ isCreating, onClose, onCreate }: CreateDashboardModalProps) {
  const [name, setName] = useState('');

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <div className="p-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Yeni Sayfa</h2>
        <div className="mt-4 space-y-1.5">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)]">Ad</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name.trim())}
            className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
            placeholder="ör. Sürüm Komuta Merkezi"
            // biome-ignore lint/a11y/noAutofocus: primary field of a freshly opened modal
            autoFocus
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => name.trim() && onCreate(name.trim())}
            disabled={!name.trim() || isCreating}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isCreating ? 'Oluşturuluyor…' : 'Oluştur'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/** Shared modal backdrop + animated panel shell. */
function ModalShell({
  onClose,
  maxWidth,
  children,
}: {
  onClose: () => void;
  maxWidth: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className={`relative w-full ${maxWidth} mx-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-xl`}
      >
        {children}
      </motion.div>
    </div>
  );
}
