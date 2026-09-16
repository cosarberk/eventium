/**
 * @fileoverview Page Source — the whole page as one canonical, editable document.
 *
 * A live "view source" of the entire page: meta, design settings, variables,
 * every block (options + bindings) and blueprint links. Editing writes back to
 * the model (blocks, variables, layout), so the canvas, inspector and blueprint
 * all follow. Not focused → re-syncs from the model as it changes elsewhere.
 */
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useDashboardStore } from '@/storage/dashboard.store';
import { useVariablesStore } from '@/storage/variables.store';
import { pageSourceJson, parsePageSource, sourceToBlocks } from './page-source';

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

/** The Page Source document. */
export function PageSourcePanel() {
  const { isDark } = useTheme();
  const page = useDashboardStore((s) => s.activeDashboard);
  const replaceBlocks = useDashboardStore((s) => s.replaceBlocks);
  const patchLayout = useDashboardStore((s) => s.patchLayout);
  const setBlueprintEdges = useDashboardStore((s) => s.setBlueprintEdges);
  const variables = useVariablesStore((s) => s.variables);
  const setAllVariables = useVariablesStore((s) => s.setAll);

  const [text, setText] = useState(() => (page ? pageSourceJson(page, variables) : ''));
  const [error, setError] = useState<string | null>(null);
  const focusedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Model → Source: re-sync when not editing.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-key on page + variables content
  useEffect(() => {
    if (focusedRef.current || !page) return;
    const gen = pageSourceJson(page, variables);
    setText((cur) => (cur === gen ? cur : gen));
    setError(null);
  }, [page, variables]);

  const apply = (value: string) => {
    const res = parsePageSource(value);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    const { source } = res;
    // Whole-page write-back: blocks, variables, design settings, links.
    replaceBlocks(sourceToBlocks(source));
    setAllVariables(source.variables);
    patchLayout({
      layoutMode: source.design.layoutMode,
      columns: source.design.columns,
      projectType: source.meta.type,
      blueprintEdges: source.links,
    });
    setBlueprintEdges(source.links);
  };

  const onChange = (value?: string) => {
    const v = value ?? '';
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(v), 450);
  };

  const onMount: OnMount = (ed) => {
    ed.onDidFocusEditorText(() => {
      focusedRef.current = true;
    });
    ed.onDidBlurEditorText(() => {
      focusedRef.current = false;
      if (page) {
        setText(pageSourceJson(page, useVariablesStore.getState().variables));
        setError(null);
      }
    });
  };

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--color-bg-primary)] text-xs text-[var(--color-text-tertiary)]">
        Açık sayfa yok.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <div className="border-b border-[var(--color-border-primary)] px-3 py-1.5 text-[11px] text-[var(--color-text-tertiary)]">
        Proje kaynağı — tüm sayfa (meta · tasarım · değişkenler · bileşenler · bağlar) canlı
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language="json"
          beforeMount={defineThemes}
          theme={isDark ? 'eventium-dark' : 'eventium-light'}
          value={text}
          onChange={onChange}
          onMount={onMount}
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
      </div>
      {error && (
        <div className="shrink-0 border-t border-[var(--color-border-primary)] bg-red-500/10 px-3 py-1 text-[11px] text-red-400">
          JSON hatası: {error}
        </div>
      )}
    </div>
  );
}
