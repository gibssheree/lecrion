import { ReactNode } from "react";

type StatCardColor = "blue" | "green" | "yellow" | "red" | "purple" | "gray";

interface StatCardProps {
  color?: StatCardColor;
  label: string;
  value: ReactNode;
  sub?: string;
}

/**
 * StatCard — summary tile used in overview-style grids.
 * Wraps the `.stat-card {color}` CSS pattern.
 */
export function StatCard({ color = "blue", label, value, sub }: StatCardProps) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

interface StatGridProps {
  children: ReactNode;
  columns?: number;
}

/**
 * StatGrid — responsive grid wrapper for StatCard tiles.
 */
export function StatGrid({ children, columns }: StatGridProps) {
  return (
    <div
      className="stat-grid"
      style={
        columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined
      }
    >
      {children}
    </div>
  );
}
