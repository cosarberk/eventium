/**
 * @fileoverview `timeline` component — a chronological list of entries.
 *
 * The single bound value on the `items` slot supplies a resolved list; each
 * element is one row (its formatted value is the title), marked with a severity
 * dot from the value's conditional color rules.
 */
import type { ComponentDescriptor } from '@/types';
import { evalColorRules, formatValue } from '../format';
import type { ComponentRenderer, ComponentRenderProps } from '../render-types';
import { severityStyle } from '../severity';
import { EmptyState, effectiveList, slotValues } from './common';

const descriptor: ComponentDescriptor = {
  type: 'timeline',
  label: 'Timeline',
  description: 'A chronological feed of entries.',
  icon: '🕑',
  slots: [{ key: 'items', label: 'Items', shape: 'list', required: true, multiple: false }],
  defaultWidth: 6,
  defaultHeight: 5,
};

function render({ data }: ComponentRenderProps) {
  const first = slotValues(data, 'items')[0];
  if (!first) return <EmptyState label="No activity" />;

  const { boundValue, resolved } = first;
  const items = effectiveList(resolved);
  if (items.length === 0) return <EmptyState label="No activity" />;

  return (
    <div className="h-full divide-y divide-current/[0.06] overflow-auto">
      {items.map((item, i) => {
        const style = severityStyle(evalColorRules(item, boundValue.rules));
        return (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-current/[0.03]"
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {formatValue(item, boundValue.format)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The `timeline` renderer registry entry. */
export const TimelineRenderer: ComponentRenderer = { descriptor, render };
