import { ReactNode } from "react";
import { RefreshCw } from "lucide-react";

interface PageHeaderProps {
  /** Left side: title or search/filter controls */
  children?: ReactNode;
  /** Right side: action buttons */
  actions?: ReactNode;
  /** Convenience: show a refresh button that calls this fn */
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * PageHeader — card-style header bar used at the top of pages with
 * search, filter, or action controls.
 *
 * Usage:
 *   <PageHeader onRefresh={reload}>
 *     <input className="form-input" placeholder="Cari…" />
 *   </PageHeader>
 */
export function PageHeader({
  children,
  actions,
  onRefresh,
  refreshing,
}: PageHeaderProps) {
  return (
    <div className="card" style={{ padding: "12px 20px" }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {children}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {actions}
          {onRefresh && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={onRefresh}
              disabled={refreshing}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
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

interface FilterBarProps {
  /** Filter buttons or pill groups */
  children: ReactNode;
  onRefresh?: () => void;
}

/**
 * FilterBar — horizontal pill/button filter row with optional refresh.
 */
export function FilterBar({ children, onRefresh }: FilterBarProps) {
  return <PageHeader onRefresh={onRefresh}>{children}</PageHeader>;
}
