/**
 * StatusBadge — colored badge for status labels.
 * Wraps the `.badge {color}` CSS pattern.
 *
 * Used for: order status, payment status, stock status, health checks.
 */

type BadgeColor =
  | "green"
  | "blue"
  | "yellow"
  | "red"
  | "gray"
  | "purple"
  | "orange";

interface StatusBadgeProps {
  status: string;
  /** Explicit color override. If omitted, color is resolved from the status map. */
  color?: BadgeColor;
}

// ── Order status color map ────────────────────────────────────────────────────
const ORDER_STATUS_COLORS: Record<string, BadgeColor> = {
  pending: "yellow",
  pending_payment: "blue",
  paid: "blue",
  confirmed: "blue",
  completed: "green",
  cancelled: "red",
  refunded: "gray",
};

// ── Stock status color map ────────────────────────────────────────────────────
const STOCK_STATUS_COLORS: Record<string, BadgeColor> = {
  OK: "green",
  Menipis: "yellow",
  Habis: "red",
};

// ── Health check color map ────────────────────────────────────────────────────
const HEALTH_STATUS_COLORS: Record<string, BadgeColor> = {
  ok: "green",
  fail: "red",
};

/**
 * Resolve badge color from status string.
 * Checks order, stock, and health maps in order.
 */
export function resolveStatusColor(status: string): BadgeColor {
  return (
    ORDER_STATUS_COLORS[status] ??
    STOCK_STATUS_COLORS[status] ??
    HEALTH_STATUS_COLORS[status] ??
    "gray"
  );
}

export function StatusBadge({ status, color }: StatusBadgeProps) {
  const resolved = color ?? resolveStatusColor(status);
  return <span className={`badge ${resolved}`}>{status}</span>;
}

/** Convenience: stock-specific badge with Habis/Menipis/OK labels */
export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <StatusBadge status="Habis" color="red" />;
  if (stock <= 5) return <StatusBadge status="Menipis" color="yellow" />;
  return <StatusBadge status="OK" color="green" />;
}

/** Convenience: health check status dot */
export function StatusDot({ status }: { status?: string }) {
  const color =
    status === "ok"
      ? "var(--accent-green)"
      : status === "degraded"
        ? "var(--accent-yellow)"
        : "var(--accent-red)";
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        marginRight: 4,
        flexShrink: 0,
      }}
    />
  );
}
