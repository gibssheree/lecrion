import { ReactNode } from "react";

interface LoadingStateProps {
  /** Optional icon shown above the message in empty/idle state */
  icon?: ReactNode;
  /** Message shown below the spinner or icon */
  message?: string;
  /** Secondary smaller message */
  sub?: string;
  /** Padding override (default 48px) */
  padding?: number | string;
}

/**
 * LoadingState — spinner overlay used while data is fetching.
 * Reuses the `.loading-overlay` + `.spinner` CSS classes.
 */
export function LoadingState({
  message = "Memuat…",
  padding,
}: LoadingStateProps) {
  return (
    <div
      className="loading-overlay"
      style={padding !== undefined ? { padding } : undefined}
    >
      <div className="spinner" />
      {message && <span>{message}</span>}
    </div>
  );
}

/**
 * EmptyState — shown when a list has no items.
 * Reuses `.loading-overlay` layout (centered column) without the spinner.
 */
export function EmptyState({
  icon,
  message = "Tidak ada data",
  sub,
  padding,
}: LoadingStateProps) {
  return (
    <div
      className="loading-overlay"
      style={padding !== undefined ? { padding } : undefined}
    >
      {icon}
      {message && <span style={{ color: "var(--text-muted)" }}>{message}</span>}
      {sub && (
        <span
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}
