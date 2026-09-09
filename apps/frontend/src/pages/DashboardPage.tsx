/**
 * @fileoverview Design-layer page builder.
 *
 * A Grafana-style grid where the user drops generic components (blocks) and binds
 * their slots to cross-source data. Blocks are rendered through the design
 * registry via {@link BlockGrid}, identical to the live/TV views. Selecting a
 * block opens the {@link BlockInspector} to edit its bindings, colors, formats,
 * and options. Layout + content is persisted on save.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { BlockGrid } from '@/components/design/BlockGrid';
import { BlockInspector } from '@/components/design/BlockInspector';
import { PageShareControls } from '@/components/design/PageShareControls';
import { listComponentDescriptors } from '@/components/design/registry';
import { useDashboard } from '@/hooks/useDashboard';
import type { ComponentDescriptor } from '@/types';
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
    addBlock,
    removeBlock,
    updateBlockLayout,
    updateBlockTitle,
    updateBlockSlots,
    updateBlockOptions,
    createDashboard,
    deleteDashboard: deleteDashboardMutation,
    updateDashboard: updateDashboardMutation,
    saveLayout,
    isCreating,
  } = useDashboard();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  /** Sync server pages into the store. */
  useEffect(() => {
    if (dashboards.length > 0) {
      setDashboards(dashboards);
    }
  }, [dashboards, setDashboards]);

  const blocks = useMemo(() => activeDashboard?.blocks ?? [], [activeDashboard]);
  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  );

  /** Leaving edit mode closes the inspector. */
  useEffect(() => {
    if (!isEditMode) setSelectedBlockId(null);
  }, [isEditMode]);

  /** Adds a block of the chosen component type and selects it for editing. */
  const handleAddBlock = (descriptor: ComponentDescriptor) => {
    addBlock(descriptor.type);
    setShowAddBlock(false);
    toast.success(`${descriptor.label} added`);
  };

  /** Saves the current layout/content and exits edit mode. */
  const handleSave = () => {
    saveLayout();
    toggleEditMode();
    toast.success('Page saved');
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
          toast.success('Page renamed');
          setRenaming(false);
        },
      },
    );
  };

  /** Deletes the active page. */
  const handleDelete = () => {
    if (!activeDashboard) return;
    if (!window.confirm(`Delete "${activeDashboard.name}"? This cannot be undone.`)) return;
    deleteDashboardMutation(activeDashboard.id, {
      onSuccess: () => toast.success('Page deleted'),
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
                      toast.success('Page created');
                      setShowCreateModal(false);
                    },
                    onError: () => toast.error('Failed to create page'),
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
                onClick={() => setShowAddBlock(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-dashed border-[var(--color-border-secondary)] hover:border-brand-500 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M6 2v8M2 6h8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Add Component
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
              >
                Save Page
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
            {isEditMode ? 'Done' : 'Edit Page'}
          </button>
        </div>
      </div>

      {/* Edit-mode banner */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/50 text-xs text-brand-700 dark:text-brand-300">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M7 1v12M1 7h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Edit mode — drag by the handle, resize from the corner, click the gear to bind a
              component's data, then "Save Page".
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid + inspector */}
      {blocks.length === 0 ? (
        <EmptyState
          title="Empty page"
          description={
            isEditMode
              ? 'Click "Add Component" to get started.'
              : 'Click "Edit Page" to add components.'
          }
          className="h-[50vh]"
        />
      ) : (
        <div className="flex gap-4">
          <div className="min-w-0 flex-1">
            <BlockGrid
              blocks={blocks}
              editing={isEditMode}
              onLayoutChange={updateBlockLayout}
              onRemoveBlock={(id) => {
                removeBlock(id);
                if (selectedBlockId === id) setSelectedBlockId(null);
              }}
              onConfigureBlock={setSelectedBlockId}
            />
          </div>
          <AnimatePresence>
            {isEditMode && selectedBlock && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 320 }}
                exit={{ opacity: 0, width: 0 }}
                className="shrink-0 overflow-hidden"
                style={{ height: 'calc(100vh - 220px)' }}
              >
                <div className="w-80 h-full">
                  <BlockInspector
                    block={selectedBlock}
                    onTitleChange={(title) => updateBlockTitle(selectedBlock.id, title)}
                    onSlotsChange={(slots) => updateBlockSlots(selectedBlock.id, slots)}
                    onOptionsChange={(options) => updateBlockOptions(selectedBlock.id, options)}
                    onClose={() => setSelectedBlockId(null)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                    toast.success('Page created');
                    setShowCreateModal(false);
                  },
                  onError: () => toast.error('Failed to create page'),
                },
              )
            }
          />
        )}
      </AnimatePresence>

      {/* Add component picker */}
      <AnimatePresence>
        {showAddBlock && (
          <AddBlockModal onClose={() => setShowAddBlock(false)} onAdd={handleAddBlock} />
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
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          Create your first page
        </h1>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-2 max-w-sm">
          Pages let you arrange components and bind them to data from any connected source, in
          real-time.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all hover:shadow-lg hover:shadow-brand-500/30"
      >
        Create Page
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
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">New Page</h2>
        <div className="mt-4 space-y-1.5">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onCreate(name.trim())}
            className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
            placeholder="e.g. Release War Room"
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
            Cancel
          </button>
          <button
            type="button"
            onClick={() => name.trim() && onCreate(name.trim())}
            disabled={!name.trim() || isCreating}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

interface AddBlockModalProps {
  onClose: () => void;
  onAdd: (descriptor: ComponentDescriptor) => void;
}

/** Component picker: lists every registered component descriptor. */
function AddBlockModal({ onClose, onAdd }: AddBlockModalProps) {
  const [search, setSearch] = useState('');
  const descriptors = useMemo(() => listComponentDescriptors(), []);

  const filtered = descriptors.filter(
    (d) =>
      d.label.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="p-5 border-b border-[var(--color-border-primary)]">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Add Component</h2>
        <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
          Pick a component, then bind its slots to data.
        </p>
      </div>
      <div className="px-5 pt-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search components..."
          className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors"
          // biome-ignore lint/a11y/noAutofocus: search is the entry point of the picker
          autoFocus
        />
      </div>
      <div className="max-h-[340px] overflow-y-auto p-3 space-y-1.5">
        {descriptors.length === 0 ? (
          <p className="text-xs text-[var(--color-text-tertiary)] text-center py-6">
            No components registered.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[var(--color-text-tertiary)] text-center py-6">
            No matching components
          </p>
        ) : (
          filtered.map((d) => (
            <button
              key={d.type}
              type="button"
              onClick={() => onAdd(d)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[var(--color-surface-hover)] transition-colors group"
            >
              <span className="text-lg w-8 text-center shrink-0">{d.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-brand-500 transition-colors">
                  {d.label}
                </p>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5 truncate">
                  {d.description}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
      <div className="p-3 border-t border-[var(--color-border-primary)] flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors"
        >
          Cancel
        </button>
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
