/**
 * @fileoverview Project Explorer — the file/folder tree of the open project.
 *
 * Shows the project's dynamic tree (folders + typed files). Create files (via the
 * New File dialog) and folders, rename (double-click), delete, and open pages by
 * clicking their `.ep` file. Files display with their registry extension.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useNodes } from '@/hooks/useNodes';
import { fetchProjects } from '@/services/project.service';
import { useDashboardStore } from '@/storage/dashboard.store';
import type { ProjectNode } from '@/types';
import { fileLabel, getFileType } from './file-types';
import { PanelEmpty } from './PanelEmpty';

/** A node with its resolved children (built from the flat list). */
interface TreeNode extends ProjectNode {
  children: TreeNode[];
}

function buildTree(nodes: ProjectNode[]): TreeNode[] {
  const byParent = new Map<string | null, ProjectNode[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }
  const attach = (parentId: string | null): TreeNode[] =>
    (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((n) => ({ ...n, children: attach(n.id) }));
  return attach(null);
}

const emitNewFile = (parentId: string | null) =>
  window.dispatchEvent(new CustomEvent('eventium:new-file', { detail: parentId ?? '' }));

/** Ask the dock to open a non-page file in its own document. */
const emitOpenFile = (node: { id: string; kind: string; name: string }) =>
  window.dispatchEvent(new CustomEvent('eventium:open-file', { detail: node }));

/** The Explorer panel. */
export function ExplorerPanel() {
  const activeProject = useDashboardStore((s) => s.activeProject);
  const openPage = useDashboardStore((s) => s.openPage);
  const addPage = useDashboardStore((s) => s.addPage);
  const removePageFromProject = useDashboardStore((s) => s.removePageFromProject);
  const activePageId = useDashboardStore((s) => s.activeDashboard?.id);
  const { nodes, isLoading, createNode, renameNode, deleteNode, moveNode, duplicateNode } =
    useNodes(activeProject?.id);

  /** Delete a node; if it's a page, also drop it from the open project. */
  const handleDelete = async (id: string) => {
    const node = nodes.find((n) => n.id === id);
    await deleteNode(id);
    if (node?.kind === 'page' && node.refId) removePageFromProject(node.refId);
  };
  const [dropRoot, setDropRoot] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; node: ProjectNode | null } | null>(null);

  const tree = useMemo(() => buildTree(nodes), [nodes]);

  /** Guard: a node may not be dropped into itself or a descendant. */
  const isDescendant = (ancestorId: string, maybeChildId: string): boolean => {
    let cur: string | null | undefined = maybeChildId;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    while (cur) {
      if (cur === ancestorId) return true;
      cur = byId.get(cur)?.parentId ?? null;
    }
    return false;
  };

  /** Move a dragged node under a new parent (null = root). */
  const handleMove = (dragId: string, parentId: string | null) => {
    if (dragId === parentId) return;
    if (parentId && isDescendant(dragId, parentId)) return; // no cycles
    const siblings = nodes.filter((n) => (n.parentId ?? null) === parentId && n.id !== dragId);
    void moveNode({ id: dragId, parentId, order: siblings.length });
  };

  const openNode = async (node: ProjectNode) => {
    if (node.kind !== 'page') {
      emitOpenFile({ id: node.id, kind: node.kind, name: node.name });
      return;
    }
    if (!node.refId) return;
    const existing = activeProject?.pages.find((p) => p.id === node.refId);
    if (existing) {
      openPage(existing);
      return;
    }
    // Freshly created page — pull the latest project pages, then open it.
    try {
      const projects = await fetchProjects();
      const page = projects
        .find((p) => p.id === activeProject?.id)
        ?.pages.find((p) => p.id === node.refId);
      if (page) addPage(page);
      else toast.error('Sayfa açılamadı');
    } catch {
      toast.error('Sayfa açılamadı');
    }
  };

  const newFolder = async (parentId: string | null = null) => {
    const name = window.prompt('Klasör adı');
    if (!name?.trim() || !activeProject) return;
    await createNode({ projectId: activeProject.id, parentId, kind: 'folder', name: name.trim() });
  };

  /** Open the right-click menu for a node (or empty space when node is null). */
  const openMenu = (e: React.MouseEvent, node: ProjectNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, node });
  };

  if (!activeProject) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--color-bg-secondary)] p-4 text-center text-xs text-[var(--color-text-tertiary)]">
        Bir proje aç.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-secondary)]">
      <div className="flex items-center justify-between gap-1 border-b border-[var(--color-border-primary)] px-2 py-1">
        <span className="truncate pl-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
          {activeProject.name}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => emitNewFile(null)}
            title="Yeni dosya"
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M3 1.5h5L11 4.5v8a.5.5 0 01-.5.5h-7a.5.5 0 01-.5-.5v-11a.5.5 0 01.5-.5zM8 1.5V5h3M7 7v3M5.5 8.5h3"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void newFolder(null)}
            title="Yeni klasör"
            className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M1.5 3.5a1 1 0 011-1h3l1.5 1.5h4a1 1 0 011 1v6a1 1 0 01-1 1h-9a1 1 0 01-1-1v-7.5zM7 7v3M5.5 8.5h3"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop target for moving nodes to the root */}
      <div
        className={`min-h-0 flex-1 overflow-auto py-1 ${dropRoot ? 'bg-brand-500/5 ring-1 ring-inset ring-brand-500/40' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDropRoot(true);
        }}
        onDragLeave={() => setDropRoot(false)}
        onDrop={(e) => {
          setDropRoot(false);
          const dragId = e.dataTransfer.getData('application/eventium-node');
          if (dragId) handleMove(dragId, null);
        }}
        onContextMenu={(e) => openMenu(e, null)}
      >
        {isLoading ? (
          <p className="px-3 py-2 text-[11px] text-[var(--color-text-tertiary)]">Yükleniyor…</p>
        ) : tree.length === 0 ? (
          <PanelEmpty icon="🗂️" text="Boş proje. Sağ üstten yeni dosya ya da klasör ekle." />
        ) : (
          tree.map((n) => (
            <TreeItem
              key={n.id}
              node={n}
              depth={0}
              activePageId={activePageId}
              onOpenPage={openNode}
              onNewFile={emitNewFile}
              onRename={(id, name) => renameNode({ id, name })}
              onDelete={(id) => handleDelete(id)}
              onMove={handleMove}
              renamingId={renamingId}
              onStartEdit={setRenamingId}
              onEndEdit={() => setRenamingId(null)}
              onContextMenu={openMenu}
            />
          ))
        )}
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          node={menu.node}
          onClose={() => setMenu(null)}
          onNewFile={(parentId) => emitNewFile(parentId)}
          onNewFolder={(parentId) => void newFolder(parentId)}
          onOpen={(n) => openNode(n)}
          onRename={(id) => setRenamingId(id)}
          onDelete={(id) => handleDelete(id)}
          onDuplicate={(id) => void duplicateNode(id)}
        />
      )}
    </div>
  );
}

/** The right-click context menu. */
function ContextMenu({
  x,
  y,
  node,
  onClose,
  onNewFile,
  onNewFolder,
  onOpen,
  onRename,
  onDelete,
  onDuplicate,
}: {
  x: number;
  y: number;
  node: ProjectNode | null;
  onClose: () => void;
  onNewFile: (parentId: string | null) => void;
  onNewFolder: (parentId: string | null) => void;
  onOpen: (n: ProjectNode) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const isFolder = node?.kind === 'folder';
  const parentForNew = node ? (isFolder ? node.id : (node.parentId ?? null)) : null;
  const items: { label: string; danger?: boolean; run: () => void }[] = [];
  if (node && !isFolder) items.push({ label: 'Aç', run: () => onOpen(node) });
  items.push({ label: 'Yeni dosya…', run: () => onNewFile(parentForNew) });
  items.push({ label: 'Yeni klasör…', run: () => onNewFolder(parentForNew) });
  if (node) {
    if (!isFolder) items.push({ label: 'Çoğalt', run: () => onDuplicate(node.id) });
    items.push({ label: 'Yeniden adlandır', run: () => onRename(node.id) });
    items.push({
      label: 'Sil',
      danger: true,
      run: () => {
        if (window.confirm(`"${node.name}" silinsin mi?`)) onDelete(node.id);
      },
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Menüyü kapat"
        className="fixed inset-0 z-[60] cursor-default"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-[61] min-w-[168px] rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-elevated)] py-1 shadow-xl"
        style={{
          left: Math.min(x, window.innerWidth - 180),
          top: Math.min(y, window.innerHeight - 180),
        }}
      >
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={() => {
              onClose();
              it.run();
            }}
            className={`flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--color-surface-hover)] ${
              it.danger
                ? 'text-red-400 hover:text-red-400'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </>
  );
}

/** One tree row (folder or file), recursive. */
function TreeItem({
  node,
  depth,
  activePageId,
  onOpenPage,
  onNewFile,
  onRename,
  onDelete,
  onMove,
  renamingId,
  onStartEdit,
  onEndEdit,
  onContextMenu,
}: {
  node: TreeNode;
  depth: number;
  activePageId?: string;
  onOpenPage: (n: ProjectNode) => void;
  onNewFile: (parentId: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMove: (dragId: string, parentId: string | null) => void;
  renamingId: string | null;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
  onContextMenu: (e: React.MouseEvent, node: ProjectNode) => void;
}) {
  const isFolder = node.kind === 'folder';
  const type = getFileType(node.kind);
  const [open, setOpen] = useState(true);
  const [name, setName] = useState(node.name);
  const [dropHere, setDropHere] = useState(false);
  const editing = renamingId === node.id;
  const isActive = node.kind === 'page' && node.refId && node.refId === activePageId;

  const commit = () => {
    onEndEdit();
    const v = name.trim();
    if (v && v !== node.name) onRename(node.id, v);
    else setName(node.name);
  };

  return (
    <div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drag row + folder drop target */}
      <div
        draggable={!editing}
        onContextMenu={(e) => onContextMenu(e, node)}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('application/eventium-node', node.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={
          isFolder
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropHere(true);
              }
            : undefined
        }
        onDragLeave={isFolder ? () => setDropHere(false) : undefined}
        onDrop={
          isFolder
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropHere(false);
                const dragId = e.dataTransfer.getData('application/eventium-node');
                if (dragId) onMove(dragId, node.id);
              }
            : undefined
        }
        className={`group flex items-center gap-1 rounded px-1 py-[3px] text-[12px] ${
          isActive
            ? 'bg-brand-500/15 text-brand-400'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
        } ${dropHere ? 'ring-1 ring-inset ring-brand-500/60 bg-brand-500/10' : ''}`}
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        {isFolder ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--color-text-tertiary)]"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden="true"
              style={{ transform: open ? 'rotate(90deg)' : 'none' }}
            >
              <path
                d="M3.5 2l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="text-[13px] leading-none">
          {isFolder ? (open ? '📂' : '📁') : (type?.icon ?? '📄')}
        </span>

        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setName(node.name);
                onEndEdit();
              }
            }}
            className="min-w-0 flex-1 rounded border border-brand-500 bg-[var(--color-bg-primary)] px-1 py-0 text-[12px] text-[var(--color-text-primary)] outline-none"
            // biome-ignore lint/a11y/noAutofocus: inline rename should focus immediately
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => (isFolder ? setOpen((v) => !v) : onOpenPage(node))}
            onDoubleClick={() => onStartEdit(node.id)}
            className="min-w-0 flex-1 truncate text-left"
          >
            {isFolder ? node.name : fileLabel(node.kind, node.name)}
          </button>
        )}

        {/* Hover actions */}
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {isFolder && (
            <button
              type="button"
              title="İçine yeni dosya"
              onClick={() => onNewFile(node.id)}
              className="flex h-4 w-4 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              +
            </button>
          )}
          <button
            type="button"
            title="Sil"
            onClick={() => {
              if (window.confirm(`"${node.name}" silinsin mi?`)) onDelete(node.id);
            }}
            className="flex h-4 w-4 items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-red-400"
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2 3.5h10M5 3.5V2h4v1.5M4 3.5v8a1 1 0 001 1h4a1 1 0 001-1v-8"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </span>
      </div>

      {isFolder &&
        open &&
        node.children.map((c) => (
          <TreeItem
            key={c.id}
            node={c}
            depth={depth + 1}
            activePageId={activePageId}
            onOpenPage={onOpenPage}
            onNewFile={onNewFile}
            onRename={onRename}
            onDelete={onDelete}
            onMove={onMove}
            renamingId={renamingId}
            onStartEdit={onStartEdit}
            onEndEdit={onEndEdit}
            onContextMenu={onContextMenu}
          />
        ))}
    </div>
  );
}
