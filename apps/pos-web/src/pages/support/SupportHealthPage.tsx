import { Activity, Database, RefreshCw, Server } from "lucide-react";
import PosAppShell from "../../components/layout/PosAppShell";
import { useApi } from "../../hooks/useApi";
import { getAdminSystemHealth } from "../../services/api";
import { fmt } from "../../utils/fmt";

export default function SupportHealthPage() {
  const health = useApi(getAdminSystemHealth, [], { autoRefreshMs: 15_000 });

  const dbOk = health.data?.db.ok ?? false;

  return (
    <PosAppShell title="System Health">
      <div className="summary-grid" style={{ marginBottom: 16 }}>
        <div className="summary-card">
          <div className="summary-card-label">
            <Database
              size={12}
              color={dbOk ? "var(--stock-ok)" : "var(--stock-out)"}
            />
            Database
          </div>
          <div className="summary-card-value" style={{ fontSize: 16 }}>
            {dbOk ? "ONLINE" : "DOWN"}
          </div>
          <div className="summary-card-sub">
            Latency: {health.data?.db.latencyMs ?? "—"}ms
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Activity size={12} color="var(--primary)" />
            Outbox
          </div>
          <div className="summary-card-value">
            {fmt(health.data?.sync.pendingOutbox ?? 0)}
          </div>
          <div className="summary-card-sub">pending events</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Server size={12} color="var(--stock-ok)" />
            Total Merchants
          </div>
          <div className="summary-card-value">
            {fmt(health.data?.activity.stores ?? 0)}
          </div>
          <div className="summary-card-sub">
            {fmt(health.data?.activity.users ?? 0)} pengguna
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Activity size={12} color="var(--stock-low)" />
            Aktivitas Hari Ini
          </div>
          <div className="summary-card-value">
            {fmt(health.data?.activity.ordersToday ?? 0)}
          </div>
          <div className="summary-card-sub">
            {fmt(health.data?.activity.sessionsActive ?? 0)} register aktif
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span>Sync Queue Detail</span>
            <button className="btn btn-ghost btn-sm" onClick={health.reload}>
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="dashboard-card-body">
            <div className="shift-row">
              <span className="shift-row-label">Pending</span>
              <span className="shift-row-value">
                {fmt(health.data?.sync.pendingOutbox ?? 0)}
              </span>
            </div>
            <div className="shift-row">
              <span className="shift-row-label">Processed</span>
              <span className="shift-row-value">
                {fmt(health.data?.sync.processedOutbox ?? 0)}
              </span>
            </div>
            <div className="shift-row">
              <span className="shift-row-label">Failed / Dead</span>
              <span
                className="shift-row-value"
                style={{
                  color:
                    (health.data?.sync.failedOutbox ?? 0) > 0
                      ? "var(--danger)"
                      : undefined,
                }}
              >
                {fmt(health.data?.sync.failedOutbox ?? 0)}
              </span>
            </div>
            <div className="shift-row">
              <span className="shift-row-label">Last processed</span>
              <span className="shift-row-value" style={{ fontSize: 11 }}>
                {health.data?.sync.lastProcessedAt
                  ? new Date(health.data.sync.lastProcessedAt).toLocaleString(
                      "id-ID",
                    )
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span>Snapshot</span>
          </div>
          <div className="dashboard-card-body">
            <div className="shift-row">
              <span className="shift-row-label">Server time</span>
              <span className="shift-row-value" style={{ fontSize: 11 }}>
                {health.data?.timestamp
                  ? new Date(health.data.timestamp).toLocaleString("id-ID")
                  : "—"}
              </span>
            </div>
            <div className="shift-row">
              <span className="shift-row-label">DB latency</span>
              <span className="shift-row-value">
                {health.data?.db.latencyMs ?? "—"} ms
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              Auto-refresh setiap 15 detik. Untuk diagnosa lebih dalam, gunakan
              audit log atau periksa observability di infrastructure.
            </div>
          </div>
        </div>
      </div>
    </PosAppShell>
  );
}
