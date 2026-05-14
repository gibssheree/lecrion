import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { LoadingState } from "../ui/LoadingState";
import { ROUTE_TITLES } from "../../routes/routePaths";

/**
 * DashboardShell — the persistent app frame: sidebar + main content area.
 * Renders the current route's page via <Outlet />.
 * Reads auth state from the store — no props needed.
 */
export function DashboardShell() {
  const location = useLocation();
  const title = ROUTE_TITLES[location.pathname] ?? "Dashboard";

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        <header className="page-header">
          <h2>{title}</h2>
          <span className="header-badge">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
          <div className="header-actions">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 12px",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--accent-green)",
                  display: "inline-block",
                }}
              />
              Online
            </div>
          </div>
        </header>

        <div className="page-body">
          <Suspense fallback={<LoadingState message="Memuat halaman…" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
