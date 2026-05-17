// apps/pos-web/src/features/customers/PromoInput.tsx
//
// PromoInput — voucher code input with validation and discount preview.
// Used in PaymentDrawer to apply a voucher before checkout.

import { useState } from "react";
import { Tag, CheckCircle, XCircle, Loader } from "lucide-react";

interface PromoResult {
  discountAmount: number;
  promotionId: number | null;
  voucherCode: string | null;
  description: string;
}

interface Props {
  orderTotal: number;
  storeId?: string;
  onApply: (result: PromoResult | null) => void;
  applied: PromoResult | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

export default function PromoInput({
  orderTotal,
  storeId,
  onApply,
  applied,
}: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        total: String(orderTotal),
        storeId: storeId ?? "default-store",
        voucherCode: trimmed,
      });
      const res = await fetch(`/api/customers/promotions/calculate?${params}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("pos_token") ?? ""}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Voucher tidak valid");
      if (data.discountAmount <= 0)
        throw new Error("Voucher tidak memberikan diskon untuk pesanan ini");
      onApply(data);
      setCode("");
    } catch (err: any) {
      setError(err.message);
      onApply(null);
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    onApply(null);
    setCode("");
    setError(null);
  }

  if (applied) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        <CheckCircle size={14} color="#16a34a" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, color: "#15803d" }}>
            {applied.description}
          </div>
          <div style={{ fontSize: 11, color: "#16a34a" }}>
            Hemat Rp{fmt(applied.discountAmount)}
          </div>
        </div>
        <button
          onClick={handleRemove}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <XCircle size={14} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Tag
            size={13}
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
            }}
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            placeholder="Kode voucher"
            style={{
              width: "100%",
              padding: "7px 8px 7px 28px",
              border: "1px solid var(--border-color, #e5e7eb)",
              borderRadius: 8,
              fontSize: 13,
              boxSizing: "border-box",
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}
          />
        </div>
        <button
          onClick={handleApply}
          disabled={!code.trim() || loading}
          style={{
            padding: "7px 14px",
            background: "var(--color-primary, #2563eb)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 4,
            opacity: !code.trim() || loading ? 0.6 : 1,
          }}
        >
          {loading ? <Loader size={13} /> : "Pakai"}
        </button>
      </div>
      {error && (
        <div
          style={{
            fontSize: 11,
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <XCircle size={11} /> {error}
        </div>
      )}
    </div>
  );
}
