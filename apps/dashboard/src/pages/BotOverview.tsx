import { useApi } from "../hooks/useApi";
import {
  getHealth,
  getHistory,
  getOrders,
  getReportSnapshots,
} from "../services/api";
import {
  Users,
  MessageSquare,
  AlertTriangle,
  Package,
  Activity,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import {
  StatCard,
  StatGrid,
  StatusBadge,
  StatusDot,
  DataTable,
  LoadingState,
} from "../components/ui";

export default function BotOverview() {
  const health = useApi(getHealth, [], { autoRefreshMs: 30_000 });
  const history = useApi(() => getHistory(100), [], { autoRefreshMs: 15_000 });
  const orders = useApi(() => getOrders("all", 10), [], {
    autoRefreshMs: 15_000,
  });
  const snapshots = useApi(getReportSnapshots, [], { autoRefreshMs: 60_000 });

  const sys = health.data;
  const entries = (history.data?.history ?? []) as any[];
  const alerts = (snapshots.data?.snapshots?.stock_alerts?.data ?? []) as any[];
  const recentOrders = (orders.data?.orders ?? []) as any[];

  const now = Date.now();
  const last24h = entries.filter((e) => {
    try {
      return now - new Date(e.created_at).getTime() < 86_400_000;
    } catch {
      return false;
    }
  });
  const uniqueSenders = new Set(last24h.map((e: any) => e.sender)).size;

  const bySender = entries
    .slice(0, 30)
    .reduce<Record<string, any[]>>((acc, e) => {
      (acc[e.sender] = acc[e.sender] || []).push(e);
      return acc;
    }, {});
  const recentSenders = Object.entries(bySender).slice(0, 5);

  return (
    <>
      <StatGrid>
        <StatCard
          color="blue"
          label="Status Bot"
          value={
            <span
              style={{
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <StatusDot status={sys?.status} />
              {sys?.status ?? "…"}
            </span>
          }
          sub={`uptime ${sys?.uptime ?? "—"}s`}
        />
        <StatCard
          color="green"
          label={
            (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Users size={12} /> Pengguna Aktif (24j)
              </span>
            ) as any
          }
          value={uniqueSenders}
          sub="nomor WA unik"
        />
        <StatCard
          color="purple"
          label={
            (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <MessageSquare size={12} /> Total Percakapan
              </span>
            ) as any
          }
          value={entries.length}
          sub="pesan tersimpan"
        />
        <StatCard
          color="yellow"
          label={
            (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <AlertTriangle size={12} /> Stok Menipis
              </span>
            ) as any
          }
          value={alerts.length}
          sub="produk perlu restok"
        />
        <StatCard
          color="blue"
          label={
            (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Package size={12} /> Pesanan via Bot
              </span>
            ) as any
          }
          value={recentOrders.length}
          sub="10 terbaru"
        />
      </StatGrid>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Recent conversations */}
        <div className="card">
          <div className="card-title">
            <MessageSquare size={14} /> Percakapan Terbaru
          </div>
          {history.loading ? (
            <LoadingState />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentSenders.map(([sender, msgs]) => {
                const last = msgs[0];
                return (
                  <div
                    key={sender}
                    style={{
                      padding: "10px 12px",
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--radius-sm)",
                      borderLeft: "3px solid var(--primary)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Phone size={12} /> {sender}
                      </span>
                      <span className="badge gray">{msgs.length} pesan</span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Q: {last?.question ?? "—"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Clock size={10} />
                      {last?.created_at
                        ? new Date(last.created_at).toLocaleString("id-ID")
                        : ""}
                    </div>
                  </div>
                );
              })}
              {!recentSenders.length && (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    padding: 24,
                  }}
                >
                  Belum ada percakapan
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stock alerts */}
        <div className="card">
          <div className="card-title">
            <AlertTriangle size={14} /> Stok Menipis
          </div>
          <DataTable
            loading={snapshots.loading}
            rows={alerts.slice(0, 8)}
            rowKey={(_, i) => i}
            emptyMessage="Semua stok aman"
            emptyIcon={<CheckCircle size={14} color="var(--accent-green)" />}
            columns={[
              { key: "name", header: "Produk", render: (a) => a.name },
              {
                key: "stock",
                header: "Stok",
                render: (a) => (
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        a.stock <= 0
                          ? "var(--accent-red)"
                          : "var(--accent-yellow)",
                    }}
                  >
                    {a.stock}
                  </span>
                ),
              },
              {
                key: "badge",
                header: "Status",
                render: (a) => (
                  <StatusBadge
                    status={a.stock <= 0 ? "Habis" : "Menipis"}
                    color={a.stock <= 0 ? "red" : "yellow"}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="card-title">
          <Package size={14} /> Pesanan Terbaru via Bot
        </div>
        <DataTable
          loading={orders.loading}
          rows={recentOrders}
          rowKey={(o) => o.id}
          emptyMessage="Belum ada pesanan"
          columns={[
            {
              key: "id",
              header: "#",
              render: (o) => (
                <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                  #{o.id}
                </span>
              ),
            },
            { key: "name", header: "Nama", render: (o) => o.name },
            { key: "type", header: "Tipe", render: (o) => o.type },
            {
              key: "status",
              header: "Status",
              render: (o) => <StatusBadge status={o.status} />,
            },
            {
              key: "time",
              header: "Waktu",
              render: (o) => (
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {new Date(o.created_at).toLocaleString("id-ID")}
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* System health */}
      {sys?.checks && (
        <div className="card">
          <div className="card-title">
            <Activity size={14} /> System Health
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(sys.checks).map(([name, check]: [string, any]) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {check.status === "ok" ? (
                    <CheckCircle size={14} color="var(--accent-green)" />
                  ) : (
                    <XCircle size={14} color="var(--accent-red)" />
                  )}
                  <span style={{ fontWeight: 500 }}>{name}</span>
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {check.latencyMs}ms{check.error ? ` — ${check.error}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
