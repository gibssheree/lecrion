import { ClipboardList, ExternalLink, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PosAppShell from "../../components/layout/PosAppShell";
import EmptyState from "../../components/ui/EmptyState";
import { useApi } from "../../hooks/useApi";
import { getAdminPendingProfiles } from "../../services/api";

export default function SupportVerificationPage() {
  const navigate = useNavigate();
  const pending = useApi(getAdminPendingProfiles, [], {
    autoRefreshMs: 30_000,
  });

  return (
    <PosAppShell title="Antrean Verifikasi">
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ClipboardList size={14} /> Business Profile Menunggu Review
          </span>
          <button className="btn btn-ghost btn-sm" onClick={pending.reload}>
            <RefreshCw size={13} />
          </button>
        </div>
        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {pending.loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : !pending.data?.length ? (
            <EmptyState
              icon={<ClipboardList size={44} />}
              title="Tidak ada antrean"
              description="Semua permintaan verifikasi business profile sudah ditangani."
              compact
            />
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>Store ID</th>
                  <th>Verified Sekarang</th>
                  <th>Diminta</th>
                  <th>Catatan</th>
                  <th>Diperbarui</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.data.map((p) => (
                  <tr
                    key={p.storeId}
                    onClick={() => navigate(`/support/merchants/${p.storeId}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ color: "var(--primary)", fontWeight: 600 }}>
                      {p.storeId}
                    </td>
                    <td>{p.verifiedBusinessVertical}</td>
                    <td style={{ fontWeight: 500 }}>
                      {p.requestedBusinessVertical ?? "—"}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {p.notes ?? "—"}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {p.updatedAt
                        ? new Date(p.updatedAt).toLocaleString("id-ID")
                        : "—"}
                    </td>
                    <td>
                      <ExternalLink size={12} color="var(--text-muted)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
