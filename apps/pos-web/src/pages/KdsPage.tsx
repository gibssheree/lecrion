// apps/pos-web/src/pages/KdsPage.tsx
// Phase 6D — Kitchen Display System page for POS web.
// Accessible from POS navigation for F&B stores.

import { useState, useEffect, useCallback } from "react";
import { ChefHat, RefreshCw, Clock, CheckCircle } from "lucide-react";
import {
  updateKitchenTicketStatus,
  updateKitchenItemStatus,
  getActiveKitchenTickets,
} from "../services/api";

const TICKET_STATUS_COLORS: Record<
  string,
  { bg: string; border: string; text: string; label: string }
> = {
  pending: {
    bg: "#fef3c7",
    border: "#fbbf24",
    text: "#d97706",
    label: "Menunggu",
  },
  preparing: {
    bg: "#eff6ff",
    border: "#93c5fd",
    text: "#2563eb",
    label: "Dimasak",
  },
  ready: { bg: "#dcfce7", border: "#86efac", text: "#16a34a", label: "Siap" },
  served: {
    bg: "#f3f4f6",
    border: "#d1d5db",
    text: "#6b7280",
    label: "Disajikan",
  },
};

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt`;
  return `${Math.floor(mins / 60)}j ${mins % 60}m`;
}

export default function KdsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "preparing" | "ready"
  >("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActiveKitchenTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleTicketStatus(ticketId: number, status: string) {
    try {
      await updateKitchenTicketStatus(ticketId, status);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleItemStatus(itemId: number, status: string) {
    try {
      await updateKitchenItemStatus(itemId, status);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  const filtered =
    filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111827",
        color: "#f9fafb",
        padding: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <ChefHat size={24} color="#fbbf24" />
        <h1 style={{ fontSize: 20, fontWeight: 700, flex: 1 }}>
          Kitchen Display System
        </h1>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          {tickets.length} tiket aktif
        </div>
        <button
          onClick={load}
          style={{
            padding: "6px 10px",
            background: "#374151",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            color: "#f9fafb",
          }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["all", "pending", "preparing", "ready"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              background: filter === f ? "#2563eb" : "#374151",
              color: filter === f ? "#fff" : "#9ca3af",
            }}
          >
            {f === "all" ? "Semua" : (TICKET_STATUS_COLORS[f]?.label ?? f)}
            {f !== "all" && (
              <span
                style={{
                  marginLeft: 6,
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 10,
                  padding: "1px 6px",
                }}
              >
                {tickets.filter((t) => t.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}>
          <div style={{ fontSize: 14 }}>Memuat tiket…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}>
          <CheckCircle size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>
            Tidak ada tiket{" "}
            {filter !== "all"
              ? TICKET_STATUS_COLORS[filter]?.label?.toLowerCase()
              : "aktif"}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {filtered.map((t: any) => {
            const sc =
              TICKET_STATUS_COLORS[t.status] ?? TICKET_STATUS_COLORS.pending;
            const elapsed = Date.now() - new Date(t.created_at).getTime();
            const isUrgent = elapsed > 15 * 60000 && t.status !== "ready";

            return (
              <div
                key={t.id}
                style={{
                  background: "#1f2937",
                  border: `2px solid ${isUrgent ? "#ef4444" : sc.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* Ticket header */}
                <div
                  style={{
                    background: sc.bg,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: sc.text,
                      flex: 1,
                    }}
                  >
                    #{t.ticket_number}
                  </span>
                  {t.table && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: sc.text,
                        background: "rgba(0,0,0,0.1)",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      Meja {t.table.table_number}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      color: isUrgent ? "#ef4444" : sc.text,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      fontWeight: isUrgent ? 700 : 400,
                    }}
                  >
                    <Clock size={11} /> {timeSince(t.created_at)}
                  </span>
                </div>

                {/* Items */}
                <div style={{ padding: "10px 14px" }}>
                  {(t.items ?? []).map((item: any) => {
                    const ic =
                      TICKET_STATUS_COLORS[item.status] ??
                      TICKET_STATUS_COLORS.pending;
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 0",
                          borderBottom: "1px solid #374151",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#f9fafb",
                            minWidth: 24,
                          }}
                        >
                          {item.qty}×
                        </span>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#f9fafb",
                            }}
                          >
                            {item.name}
                          </div>
                          {item.notes && (
                            <div style={{ fontSize: 11, color: "#9ca3af" }}>
                              {item.notes}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: ic.bg,
                              color: ic.text,
                              fontWeight: 600,
                            }}
                          >
                            {ic.label}
                          </span>
                          {item.status === "pending" && (
                            <button
                              onClick={() =>
                                handleItemStatus(item.id, "preparing")
                              }
                              style={{
                                padding: "3px 8px",
                                fontSize: 11,
                                background: "#2563eb",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                            >
                              Mulai
                            </button>
                          )}
                          {item.status === "preparing" && (
                            <button
                              onClick={() => handleItemStatus(item.id, "ready")}
                              style={{
                                padding: "3px 8px",
                                fontSize: 11,
                                background: "#16a34a",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer",
                              }}
                            >
                              Siap
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ticket actions */}
                <div style={{ padding: "8px 14px", display: "flex", gap: 6 }}>
                  {t.status === "pending" && (
                    <button
                      onClick={() => handleTicketStatus(t.id, "preparing")}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Mulai Semua
                    </button>
                  )}
                  {t.status === "preparing" && (
                    <button
                      onClick={() => handleTicketStatus(t.id, "ready")}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        background: "#16a34a",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Semua Siap
                    </button>
                  )}
                  {t.status === "ready" && (
                    <button
                      onClick={() => handleTicketStatus(t.id, "served")}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        background: "#6b7280",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      Sudah Disajikan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
