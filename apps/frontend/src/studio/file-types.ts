/**
 * @fileoverview File-type registry — the spine of the project file system.
 *
 * Each file kind is a descriptor: its extension, icon, accent, label and whether
 * users can create it from the New File dialog. Nothing is hardcoded elsewhere —
 * adding a new file type is a single `register` call. Folders are not a file type
 * (they have no extension); they're handled by the explorer directly.
 */

/** The full description of a project file type. */
export interface FileTypeDescriptor {
  /** Machine kind stored on the node (e.g. `page`). */
  readonly kind: string;
  /** Human label, e.g. `Sayfa`. */
  readonly label: string;
  /** Extension without the dot, e.g. `ep`. */
  readonly extension: string;
  /** Emoji/glyph icon. */
  readonly icon: string;
  /** Accent color (CSS). */
  readonly accent: string;
  /** One-line description for the New File dialog. */
  readonly description: string;
  /** Whether users can create this type from the New File dialog. */
  readonly creatable: boolean;
}

const REGISTRY = new Map<string, FileTypeDescriptor>();

/** Register a file type. */
export function registerFileType(d: FileTypeDescriptor): void {
  REGISTRY.set(d.kind, d);
}

/** Look up a file type by kind. */
export function getFileType(kind: string): FileTypeDescriptor | undefined {
  return REGISTRY.get(kind);
}

/** All registered file types (creatable ones lead the New File dialog). */
export function listFileTypes(): FileTypeDescriptor[] {
  return [...REGISTRY.values()];
}

/** The display filename for a node — `name.ext` for files, `name` for folders. */
export function fileLabel(kind: string, name: string): string {
  const d = REGISTRY.get(kind);
  return d ? `${name}.${d.extension}` : name;
}

/* ── Built-in file types (havalı, anlamlı uzantılar) ───────── */
registerFileType({
  kind: 'page',
  label: 'Sayfa',
  extension: 'ep',
  icon: '📄',
  accent: '#6366f1',
  description: 'Sürükle-bırak tasarım sayfası',
  creatable: true,
});
registerFileType({
  kind: 'blueprint',
  label: 'Blueprint',
  extension: 'eb',
  icon: '🕸️',
  accent: '#a855f7',
  description: 'Görsel mantık / akış grafiği',
  creatable: true,
});
registerFileType({
  kind: 'datasource',
  label: 'Veri Kaynağı',
  extension: 'ed',
  icon: '🗄️',
  accent: '#06b6d4',
  description: 'Bir veri kaynağı bağlantısı ve sorgusu',
  creatable: true,
});
registerFileType({
  kind: 'script',
  label: 'Script',
  extension: 'es',
  icon: '📜',
  accent: '#f59e0b',
  description: 'Kod / mantık dosyası',
  creatable: true,
});
registerFileType({
  kind: 'component',
  label: 'Bileşen',
  extension: 'ec',
  icon: '🧩',
  accent: '#22c55e',
  description: 'Yeniden kullanılabilir bileşen',
  creatable: true,
});
registerFileType({
  kind: 'variables',
  label: 'Değişkenler',
  extension: 'ev',
  icon: '🔢',
  accent: '#3b82f6',
  description: 'Bir değişken seti',
  creatable: true,
});
registerFileType({
  kind: 'theme',
  label: 'Tema',
  extension: 'et',
  icon: '🎨',
  accent: '#ec4899',
  description: 'Tema / stil ayarları',
  creatable: true,
});
