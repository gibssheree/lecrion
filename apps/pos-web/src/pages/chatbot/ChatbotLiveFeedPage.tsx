import { ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  DollarSign,
  Inbox,
  Package,
  Radio,
  RefreshCw,
  ShoppingCart,
  Wifi,
  WifiOff,
} from "lucide-react";
import PosAppShell from "../../components/layout/PosAppShell";
import {
  EmptyState,
  StatCard,
  StatGrid,
} from "../../components/chatbot/ChatbotUi";
import { SocketEvent, useSocket } from "../../hooks/useSocket";

const EVENTS = [
  "order.created",
  "order.status_changed",
  "order.confirmed",
  "payment.confirmed",
  "cashflow.income.recorded",
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
  const seconds = Math.round((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s lalu`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m lalu`;
  return `${Math.round(seconds / 3600)}j lalu`;
}

interface EventStyle {
  color: string;
  icon: ReactNode;
  label: string;
}

const EVENT_STYLE: Record<string, EventStyle> = {
  "order.created": {
    color: "var(--stock-ok)",
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
  "payment.confirmed": {
    color: "var(--stock-ok)",
    icon: <DollarSign size={16} />,
    label: "Pembayaran Dikonfirmasi",
  },
  "cashflow.income.recorded": {
    color: "var(--stock-ok)",
    icon: <DollarSign size={16} />,
    label: "Pemasukan Dicatat",
  },
  "order.completed": {
    color: "var(--stock-ok)",
    icon: <Package size={16} />,
    label: "Pesanan Selesai",
  },
  "order.cancelled": {
    color: "var(--stock-out)",
    icon: <AlertTriangle size={16} />,
    label: "Pesanan Dibatalkan",
  },
  "stock.low": {
    color: "var(--stock-low)",
    icon: <AlertTriangle size={16} />,
    label: "Stok Menipis",
  },
  "stock.adjusted": {
    color: "#ea580c",
    icon: <Package size={16} />,
    label: "Stok Diubah",
  },
  "register.opened": {
    color: "var(--stock-ok)",
    icon: <Inbox size={16} />,
    label: "Kasir Dibuka",
  },
  "register.closed": {
    color: "var(--text-secondary)",
    icon: <Inbox size={16} />,
    label: "Kasir Ditutup",
  },
  "sync.inbox": {
    color: "#7c3aed",
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
  const data = entry.data;

  return (
    <div
      className={`chatbot-event-card${index === 0 ? " chatbot-event-card--new" : ""}`}
      style={{ borderLeftColor: index === 0 ? style.color : "transparent" }}
    >
      <span className="chatbot-event-icon" style={{ color: style.color }}>
        {style.icon}
      </span>
      <div className="chatbot-event-body">
        <div className="chatbot-event-title">
          <span style={{ color: style.color }}>{style.label}</span>
          <small>{relTime(entry.receivedAt)}</small>
        </div>
        <div className="chatbot-event-copy">
          {entry.eventName === "order.created" && (
            <span>
              Order <strong>#{(data as any).orderId}</strong> -{" "}
              {(data as any).name} / {(data as any).type}
            </span>
          )}
          {[
            "order.status_changed",
            "order.confirmed",
            "order.completed",
            "order.cancelled",
          ].includes(entry.eventName) && (
            <span>
              Order <strong>#{(data as any).orderId}</strong>
              {(data as any).oldStatus && <>: {(data as any).oldStatus} - </>}
              <strong style={{ color: style.color }}>
                {(data as any).newStatus ?? (data as any).status}
              </strong>
            </span>
          )}
          {entry.eventName === "payment.confirmed" && (
            <span>
              Pembayaran order <strong>#{(data as any).orderId}</strong>{" "}
              dikonfirmasi
            </span>
          )}
          {entry.eventName === "cashflow.income.recorded" && (
            <span>
              Pemasukan <strong>Rp{Number((data as any).amount ?? 0).toLocaleString("id-ID")}</strong>{" "}
              dicatat
            </span>
          )}
          {entry.eventName === "stock.low" && (
            <span>
              {(data as any).count ? (
                <>
                  {(data as any).count} produk stok menipis:{" "}
                  {((data as any).products ?? [])
                    .map((product: any) => product.name)
                    .join(", ")}
                </>
              ) : (
                <>
                  <strong>{(data as any).name}</strong> - sisa stok:{" "}
                  <strong>{(data as any).stock}</strong>
                </>
              )}
            </span>
          )}
          {entry.eventName === "stock.adjusted" && (
            <span>
              Stok <strong>{(data as any).name ?? `#${(data as any).productId}`}</strong>{" "}
              diubah ke {(data as any).stock ?? (data as any).newStock}
            </span>
          )}
          {["register.opened", "register.closed"].includes(entry.eventName) && (
            <span>Sesi kasir #{(data as any).sessionId}</span>
          )}
          {entry.eventName === "sync.inbox" && (
            <span>
              Event{" "}
              <code>{(data as any).event_type ?? (data as any).event}</code>
            </span>
          )}
          {![
            "order.created",
            "order.status_changed",
            "order.confirmed",
            "order.completed",
            "order.cancelled",
            "payment.confirmed",
            "cashflow.income.recorded",
            "stock.low",
            "stock.adjusted",
            "register.opened",
            "register.closed",
            "sync.inbox",
          ].includes(entry.eventName) && (
            <span>{JSON.stringify(data).slice(0, 120)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatbotLiveFeedPage() {
  const { connected, events } = useSocket(EVENTS);

  return (
    <PosAppShell title="Chatbot Live Feed">
      <div className={`alert ${connected ? "alert-success" : "alert-warning"}`}>
        {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
        {connected
          ? "Live feed aktif - terhubung ke server realtime"
          : "Menghubungkan ke server realtime..."}
      </div>

      <StatGrid columns={3}>
        <StatCard label="Total Events" value={events.length} />
        <StatCard
          label="Pesanan Baru"
          value={events.filter((event) => event.eventName === "order.created").length}
          color="var(--stock-ok)"
        />
        <StatCard
          label="Stock Alerts"
          value={events.filter((event) => event.eventName.startsWith("stock")).length}
          color="var(--stock-low)"
        />
      </StatGrid>

      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <span className="chatbot-label-inline">
            <Radio size={14} /> Live Event Feed
            {connected && <span className="chatbot-live-dot" />}
          </span>
          <span className="chatbot-muted">
            Menampilkan {events.length} event terbaru
          </span>
        </div>
        <div className="chatbot-event-list">
          {events.length === 0 ? (
            <EmptyState
              icon={<Radio size={40} color="var(--text-muted)" />}
              message={
                connected ? "Menunggu event masuk..." : "Tidak terhubung ke server"
              }
              sub={
                connected
                  ? "Events akan muncul saat ada pesanan, stok, atau event sistem."
                  : "Pastikan server API berjalan."
              }
              padding={48}
            />
          ) : (
            events.map((entry, index) => (
              <EventCard
                key={`${entry.receivedAt}-${index}`}
                entry={entry}
                index={index}
              />
            ))
          )}
        </div>
      </div>
    </PosAppShell>
  );
}
