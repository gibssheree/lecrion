// apps/pos-web/src/features/checkout/OnlineOrderModal.tsx
import { useState } from "react";
import { X, Smartphone, Truck, ShoppingBag, Hash, CheckCircle2 } from "lucide-react";
import { useCartStore } from "../../store/cart.store";
import { useToast } from "../../store/toast.store";

interface Props {
  onClose: () => void;
}

export const ONLINE_CHANNELS = [
  {
    id: "gofood",
    name: "GoFood",
    color: "#00aa13",
    bg: "#e6f7e9",
    border: "#8ad895",
    icon: "🛵",
    paymentMethod: "GoFood",
    desc: "Order GoFood via Gojek Tablet",
  },
  {
    id: "grabfood",
    name: "GrabFood",
    color: "#00b14f",
    bg: "#e6f8ed",
    border: "#85e0aa",
    icon: "💚",
    paymentMethod: "GrabFood",
    desc: "Order GrabFood via Grab Merchant",
  },
  {
    id: "shopeefood",
    name: "ShopeeFood",
    color: "#ee4d2d",
    bg: "#fdeee9",
    border: "#f9a897",
    icon: "🧡",
    paymentMethod: "ShopeeFood",
    desc: "Order ShopeeFood via Shopee Partner",
  },
  {
    id: "direct_courier",
    name: "Kurir Direct / Instant",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#93c5fd",
    icon: "📦",
    paymentMethod: "Courier COD",
    desc: "Pengiriman via Kurir Toko / Express",
  },
  {
    id: "other",
    name: "Lainnya",
    color: "#4b5563",
    bg: "#f3f4f6",
    border: "#d1d5db",
    icon: "🏪",
    paymentMethod: "Transfer",
    desc: "Saluran online / WhatsApp / Marketplace lain",
  },
] as const;

export default function OnlineOrderModal({ onClose }: Props) {
  const toast = useToast();
  const currentChannel = useCartStore((s) => s.channel);
  const currentExtId = useCartStore((s) => s.externalOrderId);
  const currentCourier = useCartStore((s) => s.courierName);
  const setOnlineOrderDetails = useCartStore((s) => s.setOnlineOrderDetails);
  const setOrderType = useCartStore((s) => s.setOrderType);

  const [selectedChannel, setSelectedChannel] = useState<string>(
    currentChannel || "shopeefood",
  );
  const [externalOrderId, setExternalOrderId] = useState<string>(
    currentExtId || "",
  );
  const [courierName, setCourierName] = useState<string>(
    currentCourier || "",
  );

  function handleSave() {
    const activeChanObj = ONLINE_CHANNELS.find((c) => c.id === selectedChannel);
    setOnlineOrderDetails(selectedChannel, externalOrderId.trim(), courierName.trim());
    setOrderType("delivery");

    toast.success(
      `Order Online Aktif: ${activeChanObj?.name ?? selectedChannel} ${
        externalOrderId ? `(#${externalOrderId.trim()})` : ""
      }`,
    );
    onClose();
  }

  function handleClear() {
    setOnlineOrderDetails(undefined, undefined, undefined);
    toast.info("Detail Order Online dihapus — kembali ke transaksi reguler");
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--bg-surface, #ffffff)",
          borderRadius: 16,
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid var(--border, #e2e8f0)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-elevated, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #ee4d2d 0%, #00aa13 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Smartphone size={20} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-main, #0f172a)",
                }}
              >
                Input Order Online (Tablet Stacking)
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "var(--text-muted, #64748b)",
                }}
              >
                Salin order dari Tablet GoFood / GrabFood / ShopeeFood
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ borderRadius: "50%", padding: 6, color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Channel Selector */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--text-main, #1e293b)",
              }}
            >
              <ShoppingBag size={14} /> Pilih Channel / Platform Online
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
              }}
            >
              {ONLINE_CHANNELS.map((ch) => {
                const isSelected = selectedChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(ch.id);
                      if (!courierName && ch.id === "shopeefood") setCourierName("Shopee Xpress Instant");
                      if (!courierName && ch.id === "gofood") setCourierName("GoSend Instant");
                      if (!courierName && ch.id === "grabfood") setCourierName("GrabExpress Instant");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: `2px solid ${isSelected ? ch.color : "var(--border, #e2e8f0)"}`,
                      background: isSelected ? ch.bg : "var(--bg-surface, #ffffff)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{ch.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: isSelected ? ch.color : "var(--text-main, #0f172a)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        {ch.name}
                        {isSelected && <CheckCircle2 size={14} color={ch.color} />}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-muted, #64748b)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        Metode: {ch.paymentMethod}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* External Order ID & Courier inputs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "var(--text-main, #334155)",
                }}
              >
                <Hash size={13} /> No. Pesanan Online
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="Contoh: ID240731-988"
                value={externalOrderId}
                onChange={(e) => setExternalOrderId(e.target.value)}
                style={{ fontSize: 13, textTransform: "uppercase" }}
              />
              <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
                Guna rekonsiliasi resi
              </span>
            </div>

            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 6,
                  color: "var(--text-main, #334155)",
                }}
              >
                <Truck size={13} /> Kurir / Ekspedisi
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="Shopee Xpress / GoSend / GrabExpress"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                style={{ fontSize: 13 }}
              />
              <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, display: "block" }}>
                Integrasi nama armada kurir
              </span>
            </div>
          </div>

          {/* Info note */}
          <div
            style={{
              padding: "10px 14px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 10,
              fontSize: 12,
              color: "#1e40af",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <Smartphone size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Tablet Stacking Flow:</strong> Data order ini akan dicatat ke laporan penjualan per channel, dan stok bahan mentah (BOM) otomatis kepotong saat pesanan diselesaikan.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border, #e2e8f0)",
            background: "var(--bg-elevated, #f8fafc)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {currentChannel ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleClear}
              style={{ color: "#dc2626" }}
            >
              Hapus Detail Online
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Batal
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              Simpan & Aktifkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
