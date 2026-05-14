import { useApi } from "../hooks/useApi";
import { getReportSnapshots, getHealth, getOrders } from "../services/api";
import {
  StatCard,
  StatGrid,
  StatusBadge,
  StatusDot,
  DataTable,
  LoadingState,
} from "../components/ui";

function fmt(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

export default function Overview() {
  const snapshots = useApi(getReportSnapshots, [], { autoRefreshMs: 60_000 });
  const health = useApi(getHealth, [], { autoRefreshMs: 30_000 });
  const orders = useApi(() => getOrders("all", 8), [], {
    autoRefreshMs: 15_000,
  });

  const daily = snapshots.data?.snapshots?.daily_revenue?.data?.[0];
  const monthly = snapshots.data?.snapshots?.monthly_revenue?.data?.[0];
  const alerts = (snapshots.data?.snapshots?.stock_alerts?.data ?? []) as any[];
  const topProd = (snapshots.data?.snapshots?.top_products?.data ??
    []) as any[];
  const openOrd = (snapshots.data?.snapshots?.open_orders?.data ?? []) as any[];
  const sys = health.data;

  return (
    <>
      <StatGrid>
        <StatCard
          color="blue"
          label="Revenue Hari Ini"
          value={`Rp${fmt(daily?.revenue)}`}
          sub={`${daily?.order_count ?? 0} pesanan`}
        />
        <StatCard
          color="green"
          label="Revenue Bulan Ini"
          value={`Rp${fmt(monthly?.revenue)}`}
          sub={`${monthly?.order_count ?? 0} pesanan`}
        />
        <StatCard
          color="yellow"
          label="Pesanan Aktif"
          value={openOrd.length}
          sub="belum selesai"
        />
        <StatCard
          color="red"
          label="Stok Menipis"
          value={alerts.length}
          sub="produk perlu restok"
        />
        <StatCard
          color="purple"
          label="Status Sistem"
          value={
            <span
              style={{ fontSize: 18, display: "flex", alignItems: "center" }}
            >
              <StatusDot status={sys?.status} />
              {sys?.status ?? "…"}
            </span>
          }
          sub={`uptime ${sys?.uptime ?? "—"}s`}
        />
      </StatGrid>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-title">🏆 Produk Terlaris (30 Hari)</div>
          <DataTable
            loading={snapshots.loading}
            rows={topProd.slice(0, 6)}
            rowKey={(_, i) => i}
            emptyMessage="Belum ada data"
            columns={[
              { key: "name", header: "Produk", render: (p) => p.name },
              {
                key: "units",
                header: "Terjual",
                render: (p) => `${p.units_sold} unit`,
              },
              {
                key: "revenue",
                header: "Revenue",
                render: (p) => `Rp${fmt(p.revenue)}`,
              },
            ]}
          />
        </div>

        <div className="card">
          <div className="card-title">⚠️ Stok Menipis</div>
          <DataTable
            loading={snapshots.loading}
            rows={alerts.slice(0, 8)}
            rowKey={(_, i) => i}
            emptyMessage="Semua stok aman ✓"
            columns={[
              { key: "name", header: "Produk", render: (a) => a.name },
              {
                key: "category",
                header: "Kategori",
                render: (a) => a.category,
              },
              {
                key: "stock",
                header: "Stok",
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

      <div className="card">
        <div className="card-title">📋 Pesanan Terbaru</div>
        <DataTable
          loading={orders.loading}
          rows={(orders.data?.orders ?? []).slice(0, 8) as any[]}
          rowKey={(o) => o.id}
          emptyMessage="Belum ada pesanan"
          columns={[
            {
              key: "id",
              header: "#",
              render: (o) => (
                <span style={{ color: "var(--primary)" }}>#{o.id}</span>
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
              render: (o) => new Date(o.created_at).toLocaleTimeString("id-ID"),
            },
          ]}
        />
      </div>

      {sys?.checks && (
        <div className="card">
          <div className="card-title">🏥 Health Checks</div>
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
                  <StatusDot status={check.status} />
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
