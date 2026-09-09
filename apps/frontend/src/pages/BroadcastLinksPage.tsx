/**
 * @fileoverview Broadcast links management page ("Linklerim").
 * Allows users to create, edit, delete, and manage public broadcast links
 * that expose selected dashboards via shareable URLs.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useBroadcastLinks } from '@/hooks/useBroadcastLinks';
import { useDashboard } from '@/hooks/useDashboard';
import type { BroadcastLink, Dashboard, ID } from '@/types';

/**
 * Renders the broadcast links management page with a card list,
 * create/edit modal, and action controls.
 * @returns Broadcast links page element
 */
export function BroadcastLinksPage() {
  const {
    links,
    isLoading,
    createLink,
    updateLink,
    deleteLink,
    regenerateToken,
    isCreating,
    isDeleting,
    isRegenerating,
  } = useBroadcastLinks();
  const { dashboards } = useDashboard();

  const [modalState, setModalState] = useState<{
    open: boolean;
    editing: BroadcastLink | null;
  }>({ open: false, editing: null });

  const [deleteConfirm, setDeleteConfirm] = useState<ID | null>(null);

  const openCreateModal = () => setModalState({ open: true, editing: null });
  const openEditModal = (link: BroadcastLink) => setModalState({ open: true, editing: link });
  const closeModal = () => setModalState({ open: false, editing: null });

  const handleCopyUrl = useCallback((token: string) => {
    const url = `${window.location.origin}/b/${token}`;
    void navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  }, []);

  const handleDelete = useCallback(
    async (id: ID) => {
      try {
        await deleteLink(id);
        toast.success('Broadcast link deleted');
        setDeleteConfirm(null);
      } catch {
        toast.error('Failed to delete broadcast link');
      }
    },
    [deleteLink],
  );

  const handleRegenerate = useCallback(
    async (id: ID) => {
      try {
        await regenerateToken(id);
        toast.success('Token regenerated. Old URLs are now invalid.');
      } catch {
        toast.error('Failed to regenerate token');
      }
    },
    [regenerateToken],
  );

  const handleToggleEnabled = useCallback(
    async (link: BroadcastLink) => {
      try {
        await updateLink({
          id: link.id,
          input: { enabled: !link.enabled },
        });
        toast.success(link.enabled ? 'Link disabled' : 'Link enabled');
      } catch {
        toast.error('Failed to update link');
      }
    },
    [updateLink],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Broadcast Links
          </h1>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            Create and manage public links to share your dashboards
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          Create Link
        </button>
      </div>

      {/* Links list */}
      {links.length === 0 ? (
        <EmptyState
          title="No broadcast links"
          description="Create a broadcast link to share your dashboards via a public URL."
          icon={
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path
                d="M13.5 18.5l5-5M11.5 20.5a4 4 0 01-5.66-5.66l4-4a4 4 0 015.66 0M20.5 11.5a4 4 0 015.66 5.66l-4 4a4 4 0 01-5.66 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          }
          action={
            <button
              onClick={openCreateModal}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
            >
              Create your first link
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <AnimatePresence>
            {links.map((link) => (
              <BroadcastLinkCard
                key={link.id}
                link={link}
                isDeleteConfirming={deleteConfirm === link.id}
                isDeleting={isDeleting}
                isRegenerating={isRegenerating}
                onCopy={() => handleCopyUrl(link.token)}
                onEdit={() => openEditModal(link)}
                onToggle={() => void handleToggleEnabled(link)}
                onRegenerate={() => void handleRegenerate(link.id)}
                onDeleteClick={() => setDeleteConfirm(link.id)}
                onDeleteConfirm={() => void handleDelete(link.id)}
                onDeleteCancel={() => setDeleteConfirm(null)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalState.open && (
        <BroadcastLinkModal
          editing={modalState.editing}
          dashboards={dashboards}
          isCreating={isCreating}
          onClose={closeModal}
          onSave={async (data) => {
            try {
              if (modalState.editing) {
                await updateLink({
                  id: modalState.editing.id,
                  input: data,
                });
                toast.success('Link updated');
              } else {
                await createLink({
                  name: data.name!,
                  dashboardIds: data.dashboardIds!,
                  rotationInterval: data.rotationInterval,
                });
                toast.success('Link created');
              }
              closeModal();
            } catch {
              toast.error(modalState.editing ? 'Failed to update link' : 'Failed to create link');
            }
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  BroadcastLinkCard                                                         */
/* -------------------------------------------------------------------------- */

interface BroadcastLinkCardProps {
  link: BroadcastLink;
  isDeleteConfirming: boolean;
  isDeleting: boolean;
  isRegenerating: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onRegenerate: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

/**
 * Renders a single broadcast link card with actions.
 * @param props - Card configuration
 * @returns Broadcast link card element
 */
function BroadcastLinkCard({
  link,
  isDeleteConfirming,
  isDeleting,
  isRegenerating,
  onCopy,
  onEdit,
  onToggle,
  onRegenerate,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: BroadcastLinkCardProps) {
  const broadcastUrl = `${window.location.origin}/b/${link.token}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-sm overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                {link.name}
              </h3>
              <Badge variant={link.enabled ? 'success' : 'neutral'}>
                {link.enabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <code className="text-[11px] text-[var(--color-text-tertiary)] font-mono truncate max-w-[300px]">
                {broadcastUrl}
              </code>
              <button
                onClick={onCopy}
                className="shrink-0 text-[var(--color-text-tertiary)] hover:text-brand-500 transition-colors"
                title="Copy URL"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect
                    x="4"
                    y="4"
                    width="8"
                    height="8"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M10 4V2.5A1.5 1.5 0 008.5 1h-6A1.5 1.5 0 001 2.5v6A1.5 1.5 0 002.5 10H4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-[var(--color-text-tertiary)]">
                {link.dashboards.length} dashboard
                {link.dashboards.length !== 1 ? 's' : ''}
              </span>
              {link.dashboards.length > 0 && (
                <div className="flex items-center gap-1">
                  {link.dashboards.slice(0, 3).map((d) => (
                    <Badge key={d.id} variant="neutral">
                      {d.name}
                    </Badge>
                  ))}
                  {link.dashboards.length > 3 && (
                    <Badge variant="neutral">+{link.dashboards.length - 3}</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions footer */}
      <div className="px-4 py-2.5 border-t border-[var(--color-border-primary)] flex items-center justify-end gap-2">
        {isDeleteConfirming ? (
          <>
            <span className="text-xs text-red-500 mr-auto">Delete this link?</span>
            <button
              onClick={onDeleteCancel}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onDeleteConfirm}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Confirm'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onToggle}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                link.enabled
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50'
              }`}
            >
              {link.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
              title="Regenerate token (invalidates current URL)"
            >
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onDeleteClick}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  BroadcastLinkModal                                                        */
/* -------------------------------------------------------------------------- */

interface BroadcastLinkModalProps {
  editing: BroadcastLink | null;
  dashboards: Dashboard[];
  isCreating: boolean;
  onClose: () => void;
  onSave: (data: {
    name?: string;
    dashboardIds?: ID[];
    rotationInterval?: number;
  }) => Promise<void>;
}

/**
 * Renders a modal dialog for creating or editing a broadcast link.
 * @param props - Modal configuration
 * @returns Modal dialog element
 */
function BroadcastLinkModal({
  editing,
  dashboards,
  isCreating,
  onClose,
  onSave,
}: BroadcastLinkModalProps) {
  const [name, setName] = useState(editing?.name ?? '');
  const [selectedDashboardIds, setSelectedDashboardIds] = useState<ID[]>(
    editing?.dashboards.map((d) => d.id) ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleDashboard = (id: ID) => {
    setSelectedDashboardIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (selectedDashboardIds.length === 0) return;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        dashboardIds: selectedDashboardIds,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md mx-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-xl"
      >
        <div className="p-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {editing ? 'Edit Broadcast Link' : 'Create Broadcast Link'}
          </h2>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            {editing
              ? 'Update the link name and dashboard selection.'
              : 'Choose a name and select dashboards to share.'}
          </p>

          <div className="mt-5 space-y-4">
            {/* Name field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                Link Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                placeholder="e.g. Office TV Display"
                autoFocus
              />
            </div>

            {/* Dashboard selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                Dashboards
              </label>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--color-border-primary)] divide-y divide-[var(--color-border-primary)]">
                {dashboards.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-center text-[var(--color-text-tertiary)]">
                    No dashboards available
                  </div>
                ) : (
                  dashboards.map((dashboard) => {
                    const isSelected = selectedDashboardIds.includes(dashboard.id);
                    return (
                      <button
                        key={dashboard.id}
                        onClick={() => toggleDashboard(dashboard.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-900/20'
                            : 'hover:bg-[var(--color-surface-hover)]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-brand-500 bg-brand-500'
                              : 'border-[var(--color-border-primary)]'
                          }`}
                        >
                          {isSelected && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 10 10"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M2 5l2 2 4-4"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm text-[var(--color-text-primary)]">
                          {dashboard.name}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              {selectedDashboardIds.length === 0 && (
                <p className="text-[11px] text-red-500">Select at least one dashboard</p>
              )}
            </div>

            {/* Rotation interval is configured in live/broadcast view */}
          </div>
        </div>

        {/* Modal actions */}
        <div className="px-5 py-3 border-t border-[var(--color-border-primary)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving || isCreating || !name.trim() || selectedDashboardIds.length === 0}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving || isCreating ? 'Saving...' : editing ? 'Update' : 'Create'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
