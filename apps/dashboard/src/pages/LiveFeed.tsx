import { useSocket, SocketEvent } from "../hooks/useSocket";
import {
  ShoppingCart,
  RefreshCw,
  AlertTriangle,
  Package,
  Inbox,
  Bell,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import { StatCard, StatGrid, EmptyState } from "../components/ui";

// Canonical realtime event names — must match libs/contracts/src/events/index.ts
const EVENTS = [
  "order.created",
  "order.status_changed",
  "order.confirmed",
  "order.completed",
  "order.cancelled",
  "stock.low",
  "stock.adjusted",
  "register.opened",
  "register.closed",
  "sync.inbox",
  "notification",
];

function relTime(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s lalu`;
  if (s < 3600) return `${Math.round(s / 60)}m lalu`;
  return `${Math.round(s / 3600)}j lalu`;
}

interface EventStyle {
  color: string;
  icon: React.ReactNode;
  label: string;
}

const EVENT_STYLE: Record<string, EventStyle> = {
  "order.created": {
    color: "var(--accent-green)",
    icon: <ShoppingCart size={16} />,
    label: "Pesanan Baru",
  },
  "order.status_changed": {
    color: "var(--primary)",
    icon: <RefreshCw size={16} />,
    label: "Status Pesanan",
  },
  "order.confirmed": {
    color: "var(--primary)",
    icon: <RefreshCw size={16} />,
    label: "Pesanan Dikonfirmasi",
  },
  "order.completed": {
    color: "var(--accent-green)",
    icon: <Package size={16} />,
    label: "Pesanan Selesai",
  },
  "order.cancelled": {
    color: "var(--accent-red)",
    icon: <AlertTriangle size={16} />,
    label: "Pesanan Dibatalkan",
  },
  "stock.low": {
    color: "var(--accent-yellow)",
    icon: <AlertTriangle size={16} />,
    label: "Stok Menipis",
  },
  "stock.adjusted": {
    color: "var(--accent-orange)",
    icon: <Package size={16} />,
    label: "Stok Diubah",
  },
  "register.opened": {
    color: "var(--accent-green)",
    icon: <Inbox size={16} />,
    label: "Kasir Dibuka",
  },
  "register.closed": {
    color: "var(--text-secondary)",
    icon: <Inbox size={16} />,
    label: "Kasir Ditutup",
  },
  "sync.inbox": {
    color: "var(--accent-purple)",
    icon: <Inbox size={16} />,
    label: "Sync Event",
  },
  notification: {
    color: "var(--text-secondary)",
    icon: <Bell size={16} />,
    label: "Notifikasi",
  },
};

function EventCard({ entry, index }: { entry: SocketEvent; index: number }) {
  const style = EVENT_STYLE[entry.eventName] ?? {
    color: "var(--text-muted)",
    icon: <Radio size={16} />,
    label: entry.eventName,
  };
  const d = entry.data;
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 16px",
        background: index === 0 ? "var(--bg-elevated)" : "transparent",
        borderBottom: "1px solid var(--border)",
        animation: index === 0 ? "flashIn 0.4s ease" : "none",
        borderLeft:
          index === 0 ? `3px solid ${style.color}` : "3px solid transparent",
      }}
    >
      <span style={{ color: style.color, flexShrink: 0, marginTop: 2 }}>
        {style.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: style.color }}>
            {style.label}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {relTime(entry.receivedAt)}
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            wordBreak: "break-word",
          }}
        >
          {entry.eventName === "order.created" && (
            <span>
              Order{" "}
              <strong style={{ color: "var(--accent-green)" }}>
                #{(d as any).orderId}
              </strong>{" "}
              — {(d as any).name} · {(d as any).type}
            </span>
          )}
          {[
            "order.status_changed",
            "order.confirmed",
            "order.completed",
            "order.cancelled",
          ].includes(entry.eventName) && (
            <span>
              Order <strong>#{(d as any).orderId}</strong>
              {(d as any).oldStatus && <> : {(d as any).oldStatus} → </>}
              <strong style={{ color: style.color }}>
                {(d as any).newStatus ?? (d as any).status}
              </strong>
            </span>
          )}
          {entry.eventName === "stock.low" && (
            <span>
              {(d as any).count ? (
                <>
                  {(d as any).count} produk stok menipis:{" "}
                  {((d as any).products ?? [])
                    .map((p: any) => p.name)
                    .join(", ")}
                </>
              ) : (
                <>
                  <strong>{(d as any).name}</strong> — sisa stok:{" "}
                  <strong style={{ color: "var(--accent-yellow)" }}>
                    {(d as any).stock}
                  </strong>
                </>
              )}
            </span>
          )}
          {entry.eventName === "stock.adjusted" && (
            <span>
              Stok{" "}
              <strong>{(d as any).name ?? `#${(d as any).productId}`}</strong>{" "}
              diubah → {(d as any).stock ?? (d as any).newStock}
            </span>
          )}
          {["register.opened", "register.closed"].includes(entry.eventName) && (
            <span>Sesi kasir #{(d as any).sessionId}</span>
          )}
          {entry.eventName === "sync.inbox" && (
            <span>
              Event{" "}
              <code style={{ color: "var(--accent-purple)" }}>
                {(d as any).event_type ?? (d as any).event ?? entry.eventName}
              </code>
            </span>
          )}
          {![
            "order.created",
            "order.status_changed",
            "order.confirmed",
            "order.completed",
            "order.cancelled",
            "stock.low",
            "stock.adjusted",
            "register.opened",
            "register.closed",
            "sync.inbox",
          ].includes(entry.eventName) && (
            <span>{JSON.stringify(d).slice(0, 120)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LiveFeed() {
  const { connected, events } = useSocket(EVENTS);

  return (
    <>
      <style>{`@keyframes flashIn{from{background:rgba(99,179,237,0.12)}to{background:var(--bg-elevated)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      <div
        className={`alert ${connected ? "success" : "warning"}`}
        style={{ marginBottom: 0 }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected
            ? "Live feed aktif — terhubung ke server realtime"
            : "Menghubungkan ke server… (pastikan server berjalan)"}
        </span>
      </div>

      <StatGrid columns={3}>
        <StatCard color="blue" label="Total Events" value={events.length} />
        <StatCard
          color="green"
          label="Pesanan Baru"
          value={events.filter((e) => e.eventName === "order.created").length}
        />
        <StatCard
          color="yellow"
          label="Stock Alerts"
          value={events.filter((e) => e.eventName.startsWith("stock")).length}
        />
      </StatGrid>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            className="card-title"
            style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}
          >
            <Radio size={14} /> Live Event Feed
          </span>
          {connected && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--accent-green)",
                display: "inline-block",
                boxShadow: "0 0 6px var(--accent-green)",
                animation: "pulse 2s ease infinite",
              }}
            />
          )}
          <span
            style={{
              marginLeft: "auto",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            Menampilkan {events.length} event terbaru
          </span>
        </div>
        <div style={{ maxHeight: 520, overflowY: "auto" }}>
          {events.length === 0 ? (
            <EmptyState
              icon={<Radio size={40} color="var(--text-muted)" />}
              message={
                connected
                  ? "Menunggu event masuk…"
                  : "Tidak terhubung ke server"
              }
              sub={
                connected
                  ? "Events akan muncul di sini saat ada pesanan baru, perubahan stok, atau event sistem"
                  : "Pastikan server API berjalan di localhost:3000"
              }
              padding={48}
            />
          ) : (
            events.map((entry, i) => (
              <EventCard key={entry.receivedAt + i} entry={entry} index={i} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
