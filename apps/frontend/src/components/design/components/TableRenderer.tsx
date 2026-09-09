/**
 * @fileoverview `table` component — index-aligned columns with a sticky header.
 *
 * Each bound value on the `columns` slot is one column: its label is the header
 * and its resolved list supplies the column's cells. Rows are index-aligned to
 * the longest column. Every cell is formatted and conditionally colored.
 */
import type { ComponentDescriptor } from '@/types';
import { evalColorRules, formatValue } from '../format';
import type { ComponentRenderer, ComponentRenderProps } from '../render-types';
import { severityStyle } from '../severity';
import { EmptyState, effectiveList, slotValues } from './common';

const descriptor: ComponentDescriptor = {
  type: 'table',
  label: 'Table',
  description: 'Tabular data with one column per binding.',
  icon: '▦',
  slots: [{ key: 'columns', label: 'Columns', shape: 'list', required: true, multiple: true }],
  defaultWidth: 12,
  defaultHeight: 5,
};

function render({ data }: ComponentRenderProps) {
  const columns = slotValues(data, 'columns');
  if (columns.length === 0) return <EmptyState label="No columns" />;

  const rowCount = columns.reduce(
    (max, col) => Math.max(max, effectiveList(col.resolved).length),
    0,
  );
  if (rowCount === 0) return <EmptyState label="No rows" />;

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-current/[0.04] backdrop-blur-sm">
          <tr className="border-b border-current/10">
            {columns.map(({ boundValue }) => (
              <th
                key={boundValue.id}
                className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider opacity-50"
              >
                {boundValue.label ?? '—'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }, (_, ri) => (
            <tr
              key={ri}
              className="border-b border-current/[0.06] transition-colors hover:bg-current/[0.03]"
            >
              {columns.map(({ boundValue, resolved }) => {
                const cell = effectiveList(resolved)[ri] ?? null;
                const colored = Boolean(boundValue.rules?.length);
                const style = severityStyle(evalColorRules(cell, boundValue.rules));
                return (
                  <td key={boundValue.id} className="px-3 py-2 text-left align-middle">
                    {cell === null ? (
                      <span className="opacity-30">—</span>
                    ) : (
                      <span className={colored ? style.text : ''}>
                        {formatValue(cell, boundValue.format)}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The `table` renderer registry entry. */
export const TableRenderer: ComponentRenderer = { descriptor, render };
