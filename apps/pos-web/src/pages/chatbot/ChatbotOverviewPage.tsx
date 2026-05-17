import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Package,
  Phone,
  Users,
  XCircle,
} from "lucide-react";
import PosAppShell from "../../components/layout/PosAppShell";
import {
  DataTable,
  LoadingState,
  StatCard,
  StatGrid,
  StatusBadge,
  StatusDot,
} from "../../components/chatbot/ChatbotUi";
import { useApi } from "../../hooks/useApi";
import {
  getHealth,
  getHistory,
  getOrders,
  getReportSnapshots,
} from "../../services/api";

export default function ChatbotOverviewPage() {
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
  const last24h = entries.filter((entry) => {
    try {
      return now - new Date(entry.created_at).getTime() < 86_400_000;
    } catch {
      return false;
    }
  });
  const uniqueSenders = new Set(last24h.map((entry) => entry.sender)).size;

  const bySender = entries
    .slice(0, 30)
    .reduce<Record<string, any[]>>((acc, entry) => {
      (acc[entry.sender] = acc[entry.sender] || []).push(entry);
      return acc;
    }, {});
  const recentSenders = Object.entries(bySender).slice(0, 5);

  return (
    <PosAppShell title="Chatbot Dashboard">
      <StatGrid>
        <StatCard
          label="Status Bot"
          value={
            <span className="chatbot-stat-inline">
              <StatusDot status={sys?.status} />
              {sys?.status ?? "..."}
            </span>
          }
          sub={`uptime ${sys?.uptime ?? "-"}s`}
          color="var(--primary)"
        />
        <StatCard
          label={
            <span className="chatbot-label-inline">
              <Users size={12} /> Pengguna Aktif 24j
            </span>
          }
          value={uniqueSenders}
          sub="nomor WA unik"
          color="var(--stock-ok)"
        />
        <StatCard
          label={
            <span className="chatbot-label-inline">
              <MessageSquare size={12} /> Total Percakapan
            </span>
          }
          value={entries.length}
          sub="pesan tersimpan"
          color="#7c3aed"
        />
        <StatCard
          label={
            <span className="chatbot-label-inline">
              <AlertTriangle size={12} /> Stok Menipis
            </span>
          }
          value={alerts.length}
          sub="produk perlu restok"
          color="var(--stock-low)"
        />
        <StatCard
          label={
            <span className="chatbot-label-inline">
              <Package size={12} /> Pesanan via Bot
            </span>
          }
          value={recentOrders.length}
          sub="10 terbaru"
          color="var(--primary)"
        />
      </StatGrid>

      <div className="chatbot-two-column">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span className="chatbot-label-inline">
              <MessageSquare size={14} /> Percakapan Terbaru
            </span>
          </div>
          <div className="dashboard-card-body">
            {history.loading ? (
              <LoadingState />
            ) : (
              <div className="chatbot-list">
                {recentSenders.map(([sender, messages]) => {
                  const last = messages[0];
                  return (
                    <div className="chatbot-conversation-card" key={sender}>
                      <div className="chatbot-conversation-head">
                        <span>
                          <Phone size={12} /> {sender}
                        </span>
                        <StatusBadge
                          status={`${messages.length} pesan`}
                          color="gray"
                        />
                      </div>
                      <div className="chatbot-truncate">
                        Q: {last?.question ?? "-"}
                      </div>
                      <div className="chatbot-time">
                        <Clock size={10} />
                        {last?.created_at
                          ? new Date(last.created_at).toLocaleString("id-ID")
                          : ""}
                      </div>
                    </div>
                  );
                })}
                {!recentSenders.length && (
                  <div className="chatbot-empty-line">
                    Belum ada percakapan
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span className="chatbot-label-inline">
              <AlertTriangle size={14} /> Stok Menipis
            </span>
          </div>
          <div className="dashboard-card-body dashboard-card-body--table">
            <DataTable
              loading={snapshots.loading}
              rows={alerts.slice(0, 8)}
              rowKey={(_, index) => index}
              emptyMessage="Semua stok aman"
              emptyIcon={<CheckCircle size={14} color="var(--stock-ok)" />}
              columns={[
                { key: "name", header: "Produk", render: (alert) => alert.name },
                {
                  key: "stock",
                  header: "Stok",
                  render: (alert) => (
                    <strong
                      style={{
                        color:
                          alert.stock <= 0
                            ? "var(--stock-out)"
                            : "var(--stock-low)",
                      }}
                    >
                      {alert.stock}
                    </strong>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (alert) => (
                    <StatusBadge
                      status={alert.stock <= 0 ? "Habis" : "Menipis"}
                      color={alert.stock <= 0 ? "red" : "yellow"}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <span className="chatbot-label-inline">
            <Package size={14} /> Pesanan Terbaru via Bot
          </span>
        </div>
        <div className="dashboard-card-body dashboard-card-body--table">
          <DataTable
            loading={orders.loading}
            rows={recentOrders}
            rowKey={(order) => order.id}
            emptyMessage="Belum ada pesanan"
            columns={[
              {
                key: "id",
                header: "#",
                render: (order) => <strong>#{order.id}</strong>,
              },
              { key: "name", header: "Nama", render: (order) => order.name },
              { key: "type", header: "Tipe", render: (order) => order.type },
              {
                key: "status",
                header: "Status",
                render: (order) => <StatusBadge status={order.status} />,
              },
              {
                key: "time",
                header: "Waktu",
                render: (order) => (
                  <span className="chatbot-muted">
                    {new Date(order.created_at).toLocaleString("id-ID")}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>

      {sys?.checks && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span className="chatbot-label-inline">
              <Activity size={14} /> System Health
            </span>
          </div>
          <div className="dashboard-card-body">
            <div className="chatbot-list">
              {Object.entries(sys.checks).map(([name, check]: [string, any]) => (
                <div className="chatbot-health-row" key={name}>
                  <span className="chatbot-label-inline">
                    {check.status === "ok" ? (
                      <CheckCircle size={14} color="var(--stock-ok)" />
                    ) : (
                      <XCircle size={14} color="var(--stock-out)" />
                    )}
                    <strong>{name}</strong>
                  </span>
                  <span className="chatbot-muted">
                    {check.latencyMs}ms{check.error ? ` - ${check.error}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PosAppShell>
  );
}
