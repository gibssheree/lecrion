import { useState } from "react";
import { ClipboardList, RefreshCw, Search } from "lucide-react";
import PosAppShell from "../../components/layout/PosAppShell";
import EmptyState from "../../components/ui/EmptyState";
import { useApi } from "../../hooks/useApi";
import { getAdminAuditLogs } from "../../services/api";

export default function SupportAuditPage() {
  const [storeId, setStoreId] = useState("");
  const [actor, setActor] = useState("");
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const logs = useApi(
    () =>
      getAdminAuditLogs({
        storeId: storeId || undefined,
        actor: actor || undefined,
        resource: resource || undefined,
        action: action || undefined,
        limit: 200,
      }),
    [storeId, actor, resource, action],
  );

  return (
    <PosAppShell title="Audit Log">
      <div className="dashboard-card" style={{ marginBottom: 16 }}>
        <div className="dashboard-card-header">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Search size={14} /> Filter
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={logs.reload}
            style={{ marginLeft: "auto" }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
        <div
          className="dashboard-card-body"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 8,
          }}
        >
          <div className="form-group">
            <label className="form-label">Store ID</label>
            <input
              className="form-input"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              placeholder="default-store"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Actor</label>
            <input
              className="form-input"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="user id atau email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Resource</label>
            <input
              className="form-input"
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              placeholder="orders, products, …"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Action</label>
            <input
              className="form-input"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="create, update, …"
            />
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ClipboardList size={14} /> Hasil ({logs.data?.logs.length ?? 0})
          </span>
        </div>
        <div className="dashboard-card-body" style={{ padding: 0 }}>
          {logs.loading ? (
            <div className="loading-center">
              <div className="spinner" />
            </div>
          ) : !logs.data?.logs.length ? (
            <EmptyState
              icon={<ClipboardList size={44} />}
              title="Tidak ada log"
              description="Sesuaikan filter atau perluas rentang."
              compact
            />
          ) : (
            <table className="pos-data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Store</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>ID</th>
                  <th>Channel</th>
                </tr>
              </thead>
              <tbody>
                {logs.data.logs.map((l) => (
                  <>
                    <tr
                      key={l.id}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setExpanded(expanded === l.id ? null : l.id)
                      }
                    >
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(l.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td style={{ fontWeight: 500 }}>{l.storeId}</td>
                      <td>{l.actor}</td>
                      <td style={{ color: "var(--primary)", fontWeight: 600 }}>
                        {l.action}
                      </td>
                      <td>{l.resource}</td>
                      <td style={{ color: "var(--text-muted)" }}>
                        {l.resourceId ?? "—"}
                      </td>
                      <td style={{ fontSize: 11 }}>{l.channel}</td>
                    </tr>
                    {expanded === l.id && (
                      <tr key={`${l.id}-d`}>
                        <td
                          colSpan={7}
                          style={{
                            background: "var(--bg-elevated)",
                            padding: "12px 16px",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 16,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "var(--text-muted)",
                                  marginBottom: 4,
                                }}
                              >
                                BEFORE
                              </div>
                              <pre
                                style={{
                                  background: "var(--bg-surface)",
                                  padding: 8,
                                  borderRadius: 6,
                                  fontSize: 11,
                                  margin: 0,
                                  overflow: "auto",
                                  maxHeight: 200,
                                }}
                              >
                                {JSON.stringify(l.before, null, 2) ?? "null"}
                              </pre>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "var(--text-muted)",
                                  marginBottom: 4,
                                }}
                              >
                                AFTER
                              </div>
                              <pre
                                style={{
                                  background: "var(--bg-surface)",
                                  padding: 8,
                                  borderRadius: 6,
                                  fontSize: 11,
                                  margin: 0,
                                  overflow: "auto",
                                  maxHeight: 200,
                                }}
                              >
                                {JSON.stringify(l.after, null, 2) ?? "null"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
