'use client';

interface Column {
  key: string;
  label: string;
  width?: string;
}

interface Props {
  columns: Column[];
  rows: Record<string, React.ReactNode>[];
  maxHeight?: string;
  renderCell?: (col: Column, row: Record<string, React.ReactNode>, rowIndex: number) => React.ReactNode;
  rowClassName?: (row: Record<string, React.ReactNode>, rowIndex: number) => string;
}

export default function DataTable({ columns, rows, maxHeight = '480px', renderCell, rowClassName }: Props) {
  return (
    <div
      className="overflow-auto rounded-xl border border-border bg-surface"
      style={{ maxHeight }}
    >
      <table className="w-full min-w-max border-collapse text-left font-mono text-[13px]">
        <thead className="sticky top-0 z-10 bg-surface2">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="whitespace-nowrap border-b border-border px-4 py-3 font-medium text-muted"
                style={{ minWidth: col.width ?? '140px' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                No rows to show.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-border/60 last:border-0 hover:bg-surface2/60 ${rowClassName?.(row, i) ?? ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-4 py-2.5 text-ink/90">
                    {renderCell ? renderCell(col, row, i) : row[col.key] ?? ''}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
