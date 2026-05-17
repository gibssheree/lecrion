import { CSSProperties, ReactNode } from "react";
import { RefreshCw } from "lucide-react";

type BadgeColor =
  | "green"
  | "blue"
  | "yellow"
  | "red"
  | "gray"
  | "purple"
  | "orange";

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  sub?: string;
  color?: string;
}

export function StatGrid({
  children,
  columns,
}: {
  children: ReactNode;
  columns?: number;
}) {
  return (
    <div
      className="summary-grid chatbot-summary-grid"
      style={
        columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined
      }
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color = "var(--primary)",
}: StatCardProps) {
  return (
    <div className="summary-card">
      <div className="summary-card-label">{label}</div>
      <div className="summary-card-value" style={{ color }}>
        {value}
      </div>
      {sub && <div className="summary-card-sub">{sub}</div>}
    </div>
  );
}

interface Column<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  style?: CSSProperties;
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  emptyMessage = "Tidak ada data",
  emptyIcon,
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  rowKey?: (row: T, index: number) => string | number;
}) {
  if (loading) return <LoadingState />;

  return (
    <table className="pos-data-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.header}</th>
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
                padding: "26px 0",
              }}
            >
              <span className="chatbot-empty-inline">
                {emptyIcon}
                {emptyMessage}
              </span>
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr key={rowKey ? rowKey(row, index) : index}>
              {columns.map((column) => (
                <td key={column.key} style={column.style}>
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

const STATUS_COLORS: Record<string, BadgeColor> = {
  pending: "yellow",
  pending_payment: "blue",
  paid: "blue",
  confirmed: "blue",
  completed: "green",
  cancelled: "red",
  refunded: "gray",
  OK: "green",
  Menipis: "yellow",
  Habis: "red",
  ok: "green",
  fail: "red",
};

export function StatusBadge({
  status,
  color,
}: {
  status: string;
  color?: BadgeColor;
}) {
  return (
    <span className={`chatbot-badge chatbot-badge--${color ?? STATUS_COLORS[status] ?? "gray"}`}>
      {status}
    </span>
  );
}

export function StatusDot({ status }: { status?: string }) {
  const color =
    status === "ok"
      ? "var(--stock-ok)"
      : status === "degraded"
        ? "var(--stock-low)"
        : "var(--stock-out)";

  return <span className="chatbot-status-dot" style={{ background: color }} />;
}

export function LoadingState({
  message = "Memuat...",
  padding,
}: {
  message?: string;
  padding?: number | string;
}) {
  return (
    <div
      className="loading-center chatbot-loading"
      style={padding !== undefined ? { padding } : undefined}
    >
      <div className="spinner" />
      {message && <span>{message}</span>}
    </div>
  );
}

export function EmptyState({
  icon,
  message = "Tidak ada data",
  sub,
  padding,
}: {
  icon?: ReactNode;
  message?: string;
  sub?: string;
  padding?: number | string;
}) {
  return (
    <div
      className="loading-center chatbot-empty"
      style={padding !== undefined ? { padding } : undefined}
    >
      {icon}
      {message && <span>{message}</span>}
      {sub && <small>{sub}</small>}
    </div>
  );
}

export function PageToolbar({
  children,
  actions,
  onRefresh,
  refreshing,
}: {
  children?: ReactNode;
  actions?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="dashboard-card chatbot-toolbar">
      <div className="chatbot-toolbar-inner">
        {children}
        <div className="chatbot-toolbar-actions">
          {actions}
          {onRefresh && (
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw size={13} className={refreshing ? "spin" : ""} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
