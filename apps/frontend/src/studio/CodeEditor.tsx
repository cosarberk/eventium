/**
 * @fileoverview Code view — a live, editable view of the *same* block the
 * Designer edits.
 *
 * Config-driven components (Stat, Table, Chart…) show their declarative **spec**
 * (JSON): editing it writes straight back to the block, so the canvas updates as
 * you type, and canvas edits regenerate the spec — one source of truth, two
 * producers/consumers. Custom HTML/React blocks show their **raw code** (their
 * own source). A control's Blueprint is a separate document opened from here.
 */
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useDashboardStore } from '@/storage/dashboard.store';
import type { DashboardBlock } from '@/types';
import { parseSpec, specToJson } from './block-spec';

const CODE_RENDERED = new Set(['custom-html', 'custom-react']);

/** Registers Eventium's Monaco themes (matched to the design tokens). */
function defineThemes(monaco: Monaco) {
  monaco.editor.defineTheme('eventium-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0a0e17',
      'editor.foreground': '#eef2f8',
      'editorLineNumber.foreground': '#3a475e',
      'editorLineNumber.activeForeground': '#9aa7bd',
      'editorCursor.foreground': '#818cf8',
      'editor.selectionBackground': '#6366f13a',
      'editor.lineHighlightBackground': '#131a2866',
      'editor.lineHighlightBorder': '#00000000',
      'editorIndentGuide.background1': '#1c2536',
      'editorIndentGuide.activeBackground1': '#2a3548',
      'editorGutter.background': '#0a0e17',
      'editorWidget.background': '#0f1420',
      'editorWidget.border': '#1c2536',
      'editorSuggestWidget.background': '#0f1420',
      'editorBracketMatch.background': '#6366f126',
      'editorBracketMatch.border': '#4f46e5',
      'scrollbarSlider.background': '#2a354855',
      'scrollbarSlider.hoverBackground': '#3a475e88',
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
      'editorLineNumber.foreground': '#b6bcc8',
      'editorLineNumber.activeForeground': '#4a5568',
      'editorCursor.foreground': '#4f46e5',
      'editor.selectionBackground': '#6366f126',
      'editor.lineHighlightBackground': '#f2f4f7',
      'editorGutter.background': '#ffffff',
      'editorIndentGuide.background1': '#e5e8ee',
      focusBorder: '#00000000',
    },
  });
}

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 12,
  lineHeight: 20,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  wordWrap: 'on' as const,
  tabSize: 2,
  padding: { top: 10, bottom: 10 },
  lineNumbersMinChars: 3,
  renderLineHighlight: 'line' as const,
  smoothScrolling: true,
  fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

interface CodeEditorProps {
  block: DashboardBlock;
  /** Opens this control's blueprint document; `split` docks it side by side. */
  onOpenBlueprint?: (split: boolean) => void;
}

/** The code-behind editor for one block (spec or raw code). */
export function CodeEditor({ block, onOpenBlueprint }: CodeEditorProps) {
  const isCustomCode = CODE_RENDERED.has(block.componentType);
  const language = block.componentType === 'custom-react' ? 'React / JSX' : 'HTML / JS';

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-primary)] px-3 py-1.5">
        <span className="truncate text-[11px] text-[var(--color-text-tertiary)]">
          {isCustomCode
            ? `${language} — window.EVENTIUM.data ile bağlı veriye eriş`
            : 'Tanım (spec) — tasarımla canlı senkron'}
        </span>
        {onOpenBlueprint && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenBlueprint(false)}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            >
              Blueprint
            </button>
            <button
              type="button"
              onClick={() => onOpenBlueprint(true)}
              title="Blueprint'i yan sekme grubunda aç"
              className="rounded-md px-1.5 py-1 text-[13px] leading-none text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            >
              ⇹
            </button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {isCustomCode ? <RawCodeBody block={block} /> : <SpecBody block={block} />}
      </div>
    </div>
  );
}

/** Raw HTML/JS editor for custom components (edits `options.code`). */
function RawCodeBody({ block }: { block: DashboardBlock }) {
  const updateBlockOptions = useDashboardStore((s) => s.updateBlockOptions);
  const { isDark } = useTheme();
  const code = typeof block.options.code === 'string' ? block.options.code : '';
  return (
    <Editor
      height="100%"
      language={block.componentType === 'custom-html' ? 'html' : 'javascript'}
      beforeMount={defineThemes}
      theme={isDark ? 'eventium-dark' : 'eventium-light'}
      value={code}
      onChange={(value) => updateBlockOptions(block.id, { ...block.options, code: value ?? '' })}
      loading={<EditorLoading />}
      options={EDITOR_OPTIONS}
    />
  );
}

/**
 * Spec editor for config components — a two-way live view of the block.
 *
 * While the editor is focused, keystrokes flow to the block (debounced) so the
 * canvas updates as you type; the text is not clobbered. When focus leaves, or
 * the block changes from elsewhere (the canvas), the spec re-syncs to canonical.
 */
function SpecBody({ block }: { block: DashboardBlock }) {
  const updateBlockTitle = useDashboardStore((s) => s.updateBlockTitle);
  const updateBlockOptions = useDashboardStore((s) => s.updateBlockOptions);
  const updateBlockSlots = useDashboardStore((s) => s.updateBlockSlots);
  const { isDark } = useTheme();

  const [text, setText] = useState(() => specToJson(block));
  const [error, setError] = useState<string | null>(null);
  const focusedRef = useRef(false);
  const blockRef = useRef(block);
  blockRef.current = block;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Design → Code: re-sync the spec when the block changes while not editing.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally keyed on block content only
  useEffect(() => {
    if (focusedRef.current) return;
    const gen = specToJson(block);
    setText((cur) => (cur === gen ? cur : gen));
    setError(null);
  }, [block]);

  /** Code → Design: apply only the parts that actually changed. */
  const apply = (value: string) => {
    const b = blockRef.current;
    const res = parseSpec(value);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    const { spec } = res;
    if (spec.title !== b.title) updateBlockTitle(b.id, spec.title);
    if (JSON.stringify(spec.options) !== JSON.stringify(b.options)) {
      updateBlockOptions(b.id, spec.options);
    }
    if (JSON.stringify(spec.slots) !== JSON.stringify(b.slots)) {
      updateBlockSlots(b.id, spec.slots);
    }
  };

  const onChange = (value?: string) => {
    const v = value ?? '';
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(v), 350);
  };

  const onMount: OnMount = (ed) => {
    ed.onDidFocusEditorText(() => {
      focusedRef.current = true;
    });
    ed.onDidBlurEditorText(() => {
      focusedRef.current = false;
      // Re-sync to canonical (reflects any normalization / external edits).
      setText(specToJson(blockRef.current));
      setError(null);
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language="json"
          beforeMount={defineThemes}
          theme={isDark ? 'eventium-dark' : 'eventium-light'}
          value={text}
          onChange={onChange}
          onMount={onMount}
          loading={<EditorLoading />}
          options={EDITOR_OPTIONS}
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

function EditorLoading() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-tertiary)]">
      Editör yükleniyor…
    </div>
  );
}
