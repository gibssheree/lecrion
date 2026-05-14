import { ReactNode } from "react";
import { LoadingState, EmptyState } from "./LoadingState";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  /** Optional inline style for the <td> */
  style?: React.CSSProperties;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  /** Key extractor — defaults to row index */
  rowKey?: (row: T, index: number) => string | number;
}

/**
 * DataTable — reusable table with loading and empty states.
 * Wraps the `.data-table` CSS class.
 *
 * Usage:
 *   <DataTable
 *     columns={[{ key: "name", header: "Produk", render: (r) => r.name }]}
 *     rows={products}
 *     loading={loading}
 *     emptyMessage="Tidak ada produk"
 *   />
 */
export function DataTable<T>({
  columns,
  rows,
  loading,
  emptyMessage = "Tidak ada data",
  emptyIcon,
  rowKey,
}: DataTableProps<T>) {
  if (loading) {
    return <LoadingState />;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                padding: "24px 0",
              }}
            >
              {emptyIcon ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {emptyIcon} {emptyMessage}
                </span>
              ) : (
                emptyMessage
              )}
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr key={rowKey ? rowKey(row, i) : i}>
              {columns.map((col) => (
                <td key={col.key} style={col.style}>
                  {col.render(row, i)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
