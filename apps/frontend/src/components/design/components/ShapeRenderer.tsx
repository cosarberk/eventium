/**
 * @fileoverview `shape` component — a rectangle for layout/decoration.
 *
 * Purely presentational (no slots): a filled or outlined rounded rectangle in a
 * chosen accent. Placed with the Şekil (R) tool or dragged from the palette; the
 * inspector edits its fill, style and corner radius.
 */
import type { ComponentDescriptor } from '@/types';
import type { ComponentRenderer, ComponentRenderProps } from '../render-types';
import { optionNumber, optionString } from './common';

const descriptor: ComponentDescriptor = {
  type: 'shape',
  label: 'Şekil',
  description: 'A rectangle for layout or decoration.',
  icon: '▭',
  slots: [],
  options: [
    {
      key: 'fill',
      label: 'Renk',
      type: 'select',
      defaultValue: '#6366f1',
      options: [
        { label: 'Mor', value: '#6366f1' },
        { label: 'Camgöbeği', value: '#06b6d4' },
        { label: 'Yeşil', value: '#22c55e' },
        { label: 'Amber', value: '#f59e0b' },
        { label: 'Kırmızı', value: '#ef4444' },
        { label: 'Gri', value: '#64748b' },
      ],
    },
    {
      key: 'style',
      label: 'Stil',
      type: 'select',
      defaultValue: 'filled',
      options: [
        { label: 'Dolu', value: 'filled' },
        { label: 'Çerçeve', value: 'outline' },
      ],
    },
    { key: 'radius', label: 'Köşe yuvarlaklığı', type: 'number', defaultValue: 8 },
  ],
  defaultWidth: 4,
  defaultHeight: 3,
};

function render({ block }: ComponentRenderProps) {
  const fill = optionString(block.options, 'fill', '#6366f1');
  const outline = optionString(block.options, 'style', 'filled') === 'outline';
  const radius = optionNumber(block.options, 'radius', 8);
  return (
    <div
      className="h-full w-full"
      style={{
        background: outline ? 'transparent' : fill,
        border: outline ? `2px solid ${fill}` : 'none',
        borderRadius: Math.max(0, radius),
      }}
    />
  );
}

/** The `shape` renderer registry entry. */
export const ShapeRenderer: ComponentRenderer = { descriptor, render };
