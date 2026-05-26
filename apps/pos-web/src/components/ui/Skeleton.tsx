/**
 * Skeleton — shimmer placeholder components.
 *
 * Usage:
 *   <Skeleton style={{ height: 16, width: 96 }} />
 *   <SummaryCardSkeleton />
 *   <TableRowSkeleton cols={5} />
 */

interface SkeletonProps {
  style?: React.CSSProperties;
  className?: string;
}

/** Base shimmer block — size controlled via style or className. */
export function Skeleton({ style, className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} />;
}

/** Matches the .summary-card layout used on PosDashboardPage. */
export function SummaryCardSkeleton() {
  return (
    <div className="summary-card">
      <Skeleton style={{ height: 12, width: 96, marginBottom: 6 }} />
      <Skeleton style={{ height: 28, width: 120 }} />
      <Skeleton style={{ height: 11, width: 72, marginTop: 4 }} />
    </div>
  );
}

/** Matches the 3-column .dashboard-card layout on PosDashboardPage. */
export function DashboardCardSkeleton() {
  return (
    <div className="dashboard-card">
      <div className="dashboard-card-header">
        <Skeleton style={{ height: 13, width: 80 }} />
      </div>
      <div className="dashboard-card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Skeleton style={{ height: 13, width: `${40 + (i % 3) * 15}%` }} />
            <Skeleton style={{ height: 13, width: "22%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** One row for .pos-data-table skeletons. */
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "11px 14px" }}>
          <Skeleton style={{ height: 13, width: i === 0 ? "70%" : "50%" }} />
        </td>
      ))}
    </tr>
  );
}

/** Full summary-grid skeleton (4 cards). */
export function SummaryGridSkeleton() {
  return (
    <div className="summary-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <SummaryCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Full dashboard-grid skeleton (3 cards). */
export function DashboardGridSkeleton() {
  return (
    <div className="dashboard-grid">
      {Array.from({ length: 3 }).map((_, i) => (
        <DashboardCardSkeleton key={i} />
      ))}
    </div>
  );
}
