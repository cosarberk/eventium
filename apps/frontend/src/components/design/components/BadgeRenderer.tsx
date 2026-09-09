/**
 * @fileoverview `badge` component — a responsive grid of labeled status badges.
 *
 * Each bound value on the `items` slot expands its resolved list into one badge
 * per element: the value's label captions the group and each list element is a
 * badge value, formatted and conditionally colored.
 */
import type { ComponentDescriptor } from '@/types';
import { evalColorRules, formatValue } from '../format';
import type { ComponentRenderer, ComponentRenderProps } from '../render-types';
import { severityStyle } from '../severity';
import { EmptyState, effectiveList, slotValues } from './common';

const descriptor: ComponentDescriptor = {
  type: 'badge',
  label: 'Badges',
  description: 'A grid of labeled status/version badges.',
  icon: '🏷️',
  slots: [{ key: 'items', label: 'Items', shape: 'list', required: true, multiple: true }],
  defaultWidth: 6,
  defaultHeight: 4,
};

function render({ data }: ComponentRenderProps) {
  const badges = slotValues(data, 'items').flatMap(({ boundValue, resolved }) =>
    effectiveList(resolved).map((item, i) => ({
      id: `${boundValue.id}-${i}`,
      label: boundValue.label ?? '—',
      text: formatValue(item, boundValue.format),
      severity: evalColorRules(item, boundValue.rules),
    })),
  );
  if (badges.length === 0) return <EmptyState label="No items" />;

  return (
    <div
      className="grid h-full content-start gap-2.5 p-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
    >
      {badges.map((badge) => {
        const style = severityStyle(badge.severity);
        return (
          <div
            key={badge.id}
            className="flex h-full flex-col gap-1.5 rounded-lg border border-current/10 bg-current/[0.03] px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{badge.label}</span>
              <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
            </div>
            <span
              className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 font-mono text-xs font-bold ${style.badge}`}
            >
              {badge.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The `badge` renderer registry entry. */
export const BadgeRenderer: ComponentRenderer = { descriptor, render };
