/**
 * @fileoverview `text` component — a bound scalar or a static text label.
 *
 * If the optional `content` slot has a bound value that resolves to a scalar,
 * it is formatted and conditionally colored; otherwise the static `text` option
 * is shown. Useful for captions, notes, and single readouts.
 */
import type { ComponentDescriptor } from '@/types';
import { evalColorRules, formatValue } from '../format';
import type { ComponentRenderer, ComponentRenderProps } from '../render-types';
import { severityStyle } from '../severity';
import { EmptyState, effectiveScalar, optionString, slotValues } from './common';

const descriptor: ComponentDescriptor = {
  type: 'text',
  label: 'Text',
  description: 'A static caption or a single bound value.',
  icon: '𝐓',
  slots: [{ key: 'content', label: 'Content', shape: 'scalar', required: false, multiple: false }],
  options: [{ key: 'text', label: 'Text', type: 'string' }],
  defaultWidth: 6,
  defaultHeight: 1,
};

function TextBox({ className, children }: { className: string; children: string }) {
  return (
    <div className="flex h-full w-full items-center px-3 py-2">
      <span className={`text-sm leading-relaxed ${className}`}>{children}</span>
    </div>
  );
}

function render({ data, block }: ComponentRenderProps) {
  const first = slotValues(data, 'content')[0];
  if (first && !first.resolved?.error) {
    const scalar = effectiveScalar(first.boundValue, first.resolved);
    if (scalar !== null) {
      const style = severityStyle(evalColorRules(scalar, first.boundValue.rules));
      return (
        <TextBox className={style.text}>{formatValue(scalar, first.boundValue.format)}</TextBox>
      );
    }
  }

  const staticText = optionString(block.options, 'text', '');
  if (staticText) return <TextBox className="text-current opacity-80">{staticText}</TextBox>;
  return <EmptyState label="No content" />;
}

/** The `text` renderer registry entry. */
export const TextRenderer: ComponentRenderer = { descriptor, render };
