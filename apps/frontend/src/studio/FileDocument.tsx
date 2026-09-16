/**
 * @fileoverview Generic document for a non-page project file (script, data,
 * variables, theme, component…).
 *
 * A page (`.ep`) opens the design surface; a blueprint (`.eb`) opens the graph;
 * every other file kind opens here — a Monaco editor over the node's `data`
 * content, saved back to the tree. This keeps each file type a real, editable
 * document without a bespoke editor per kind (those can specialize later).
 */
import Editor, { type Monaco } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { fetchNodes, updateNodeData } from '@/services/node.service';
import { useDashboardStore } from '@/storage/dashboard.store';
import { getFileType } from './file-types';

/** Monaco language for a file kind. */
function langFor(kind: string): string {
  if (kind === 'script') return 'javascript';
  if (kind === 'theme') return 'css';
  return 'json';
}

/** Seed content for a freshly created file kind. */
function seedFor(kind: string): string {
  switch (kind) {
    case 'script':
      return '// Eventium script\nexport function run(ctx) {\n  // ...\n}\n';
    case 'theme':
      return (
        '/* Tema — CSS değişkenleri. Çalıştır önizlemesinde sayfaya uygulanır. */\n' +
        '--color-brand-500: #6366f1;\n' +
        '--color-bg-primary: #0a0e17;\n' +
        '--color-accent-500: #06b6d4;\n'
      );
    case 'variables':
      return '{\n  "example": "value"\n}\n';
    case 'datasource':
      return '{\n  "source": "",\n  "query": {}\n}\n';
    default:
      return '{\n}\n';
  }
}

function defineThemes(monaco: Monaco) {
  monaco.editor.defineTheme('eventium-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0a0e17',
      'editor.foreground': '#eef2f8',
      'editorLineNumber.foreground': '#3a475e',
      'editorGutter.background': '#0a0e17',
      focusBorder: '#00000000',
    },
  });
  monaco.editor.defineTheme('eventium-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#0d1424',
      focusBorder: '#00000000',
    },
  });
}

/** Editor document for one non-page file node. */
export function FileDocument({ nodeId, kind }: { nodeId: string; kind: string }) {
  const { isDark } = useTheme();
  const projectId = useDashboardStore((s) => s.activeProject?.id);
  const type = getFileType(kind);
  const [text, setText] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load the node's content once (from the tree).
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!projectId) return;
      try {
        const nodes = await fetchNodes(projectId);
        const node = nodes.find((n) => n.id === nodeId);
        const content =
          typeof node?.data?.content === 'string' ? (node.data.content as string) : seedFor(kind);
        if (alive) setText(content);
      } catch {
        if (alive) setText(seedFor(kind));
      }
    })();
    return () => {
      alive = false;
    };
  }, [projectId, nodeId, kind]);

  const save = (value: string) => {
    updateNodeData(nodeId, { content: value })
      .then(() => setSaved(true))
      .catch((e: unknown) => toast.error(`Kaydedilemedi: ${(e as Error).message}`));
  };

  const onChange = (value?: string) => {
    const v = value ?? '';
    setText(v);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(v), 600);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border-primary)] px-3 py-1.5 text-[11px] text-[var(--color-text-tertiary)]">
        <span>
          {type?.icon} {type?.label} · .{type?.extension}
        </span>
        <span className={saved ? 'text-emerald-400/70' : 'text-amber-400'}>
          {saved ? 'Kaydedildi' : 'Kaydediliyor…'}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        {text === null ? (
          <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-tertiary)]">
            Yükleniyor…
          </div>
        ) : (
          <Editor
            height="100%"
            language={langFor(kind)}
            beforeMount={defineThemes}
            theme={isDark ? 'eventium-dark' : 'eventium-light'}
            value={text}
            onChange={onChange}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineHeight: 20,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              padding: { top: 10, bottom: 10 },
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            }}
          />
        )}
      </div>
    </div>
  );
}
