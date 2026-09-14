/**
 * @fileoverview Shared empty-state for tool windows — a centered icon + hint so
 * an empty panel reads as intentional, not barren.
 */
export function PanelEmpty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <span className="text-2xl opacity-30">{icon}</span>
      <p className="max-w-[220px] text-[11px] leading-relaxed text-[var(--color-text-tertiary)]">
        {text}
      </p>
    </div>
  );
}
