/**
 * @fileoverview `separator` component — a visual divider with an optional label.
 *
 * Purely presentational: no slots. When the `label` option is set it is centered
 * between two rules; otherwise a single full-width rule is drawn.
 */
import type { ComponentDescriptor } from '@/types';
import type { ComponentRenderer, ComponentRenderProps } from '../render-types';
import { optionString } from './common';

const descriptor: ComponentDescriptor = {
  type: 'separator',
  label: 'Separator',
  description: 'A visual divider, optionally titled.',
  icon: '➖',
  slots: [],
  options: [{ key: 'label', label: 'Label', type: 'string' }],
  defaultWidth: 12,
  defaultHeight: 1,
};

function render({ block }: ComponentRenderProps) {
  const label = optionString(block.options, 'label', '');
  if (!label) {
    return (
      <div className="flex h-full w-full items-center px-2">
        <div className="h-px w-full bg-current/10" />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center gap-3 px-2">
      <div className="h-px flex-1 bg-current/10" />
      <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider opacity-50">
        {label}
      </span>
      <div className="h-px flex-1 bg-current/10" />
    </div>
  );
}

/** The `separator` renderer registry entry. */
export const SeparatorRenderer: ComponentRenderer = { descriptor, render };
