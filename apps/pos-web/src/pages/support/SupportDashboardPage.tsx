import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Building2,
  CheckCircle2,
  ClipboardList,
  Server,
  ShieldAlert,
  Users,
} from "lucide-react";
import PosAppShell from "../../components/layout/PosAppShell";
import { useApi } from "../../hooks/useApi";
import {
  getAdminPendingProfiles,
  getAdminSystemHealth,
  listAdminStores,
} from "../../services/api";
import { fmt } from "../../utils/fmt";
import SupportVerticalExplorer from "../../components/support/SupportVerticalExplorer";

/**
 * Support Dashboard — overview for the platform team.
 * No merchant financials. Focus: platform-wide health, verification queue, merchants.
 */
export default function SupportDashboardPage() {
  const navigate = useNavigate();
  const stores = useApi(() => listAdminStores({ limit: 200 }), [], {
    autoRefreshMs: 60_000,
  });
  const pending = useApi(getAdminPendingProfiles, [], {
    autoRefreshMs: 60_000,
  });
  const health = useApi(getAdminSystemHealth, [], { autoRefreshMs: 30_000 });

  useEffect(() => {
    document.title = "Support · Lecrion";
  }, []);

  const totalStores = stores.data?.length ?? 0;
  const verifiedStores =
    stores.data?.filter((s) => s.verificationStatus === "verified").length ?? 0;
  const pendingCount = pending.data?.length ?? 0;
  const healthy = health.data?.db.ok ?? false;

  return (
    <PosAppShell title="Support Dashboard">
      <div className="support-banner">
        <div>
          <strong>Platform Operations</strong>
          <span>
            Konsol untuk tim Lecrion. Anda tidak melihat data finansial merchant
            — hanya kontrol platform, verifikasi, dan diagnosa sistem.
          </span>
        </div>
        <div className="support-banner__pill">
          <ShieldAlert size={14} /> SUPPORT
        </div>
      </div>

      {/* KPI cards */}
      <div className="summary-grid" style={{ marginBottom: 16 }}>
        <div className="summary-card">
          <div className="summary-card-label">
            <Building2 size={12} color="var(--primary)" /> Total Merchant
          </div>
          <div className="summary-card-value">{totalStores}</div>
          <div className="summary-card-sub">{verifiedStores} terverifikasi</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <ClipboardList size={12} color="var(--stock-low)" /> Antrean
            Verifikasi
          </div>
          <div
            className="summary-card-value"
            style={{
              color: pendingCount > 0 ? "var(--stock-low)" : undefined,
            }}
          >
            {pendingCount}
          </div>
          <div className="summary-card-sub">
            {pendingCount > 0 ? "perlu review" : "tidak ada antrean"}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Activity size={12} color="var(--stock-ok)" /> Aktivitas Hari Ini
          </div>
          <div className="summary-card-value">
            {health.data?.activity.ordersToday ?? "—"}
          </div>
          <div className="summary-card-sub">
            {health.data?.activity.sessionsActive ?? 0} register aktif
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">
            <Server
              size={12}
              color={healthy ? "var(--stock-ok)" : "var(--stock-out)"}
            />{" "}
            Status Sistem
          </div>
          <div
            className="summary-card-value"
            style={{
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: healthy ? "var(--stock-ok)" : "var(--stock-out)",
                boxShadow: healthy
                  ? "0 0 8px var(--stock-ok)"
                  : "0 0 8px var(--stock-out)",
              }}
            />
            {healthy ? "ONLINE" : "DEGRADED"}
          </div>
          <div className="summary-card-sub">
            DB latency: {health.data?.db.latencyMs ?? "—"}ms
          </div>
        </div>
      </div>

      {/* Business Vertical Explorer (Support Preview Mode) */}
      <SupportVerticalExplorer />

      {/* Two-column section */}
      <div
        className="dashboard-grid"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        {/* Pending verifications */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ClipboardList size={14} /> Verifikasi Menunggu
            </span>
            <Link
              to="/support/verifikasi"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, padding: "3px 8px", minHeight: 24 }}
            >
              Lihat semua
            </Link>
          </div>
          <div className="dashboard-card-body">
            {pendingCount === 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "24px 0",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                <CheckCircle2 size={16} color="var(--stock-ok)" />
                Semua verifikasi sudah ditangani
              </div>
            ) : (
              (pending.data ?? []).slice(0, 5).map((p) => (
                <div key={p.storeId} className="feed-item">
                  <span className="feed-item-text">
                    <strong>{p.storeId}</strong> meminta{" "}
                    <em>{p.requestedBusinessVertical ?? "—"}</em>
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "2px 8px", minHeight: 24, fontSize: 11 }}
                    onClick={() => navigate(`/support/merchants/${p.storeId}`)}
                  >
                    Review
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent merchants */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} /> Merchant Terbaru
            </span>
            <Link
              to="/support/merchants"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, padding: "3px 8px", minHeight: 24 }}
            >
              Kelola merchant
            </Link>
          </div>
          <div className="dashboard-card-body">
            {(stores.data ?? []).slice(0, 6).map((s) => (
              <div key={s.storeId} className="feed-item">
                <span className="feed-item-text">
                  <strong>{s.name}</strong>
                  {s.city && (
                    <span
                      style={{
                        color: "var(--text-muted)",
                        marginLeft: 8,
                        fontSize: 11,
                      }}
                    >
                      · {s.city}
                    </span>
                  )}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "2px 8px", minHeight: 24, fontSize: 11 }}
                  onClick={() => navigate(`/support/merchants/${s.storeId}`)}
                >
                  Detail
                </button>
              </div>
            ))}
            {(stores.data ?? []).length === 0 && (
              <div
                style={{
                  padding: 16,
                  color: "var(--text-muted)",
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                Belum ada merchant terdaftar.
              </div>
            )}
          </div>
        </div>

        {/* Sync queue */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={14} /> Outbox Queue
            </span>
            <Link
              to="/support/health"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, padding: "3px 8px", minHeight: 24 }}
            >
              Health detail
            </Link>
          </div>
          <div className="dashboard-card-body">
            <div className="shift-row">
              <span className="shift-row-label">Pending</span>
              <span className="shift-row-value">
                {fmt(health.data?.sync.pendingOutbox ?? 0)}
              </span>
            </div>
            <div className="shift-row">
              <span className="shift-row-label">Diproses</span>
              <span className="shift-row-value">
                {fmt(health.data?.sync.processedOutbox ?? 0)}
              </span>
            </div>
            <div className="shift-row">
              <span className="shift-row-label">Gagal</span>
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
              <span className="shift-row-label">Diproses terakhir</span>
              <span className="shift-row-value" style={{ fontSize: 11 }}>
                {health.data?.sync.lastProcessedAt
                  ? new Date(health.data.sync.lastProcessedAt).toLocaleString(
                      "id-ID",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      },
                    )
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span>Quick Actions</span>
          </div>
          <div
            className="dashboard-card-body"
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <Link to="/support/llm" className="btn btn-ghost">
              Konfigurasi LLM platform
            </Link>
            <Link to="/support/audit" className="btn btn-ghost">
              Lihat audit log
            </Link>
            <Link to="/support/health" className="btn btn-ghost">
              System health detail
            </Link>
          </div>
        </div>
      </div>
    </PosAppShell>
  );
}
