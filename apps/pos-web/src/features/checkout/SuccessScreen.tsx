import { CheckCircle, RotateCcw, ClipboardList, User } from "lucide-react";
import { CheckoutResult } from "./useCheckout";

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

interface Props {
  result: CheckoutResult;
  onNewTransaction: () => void;
  onViewOrders: () => void;
}

export default function SuccessScreen({
  result,
  onNewTransaction,
  onViewOrders,
}: Props) {
  return (
    <div className="success-screen" style={{ padding: "24px 20px", gap: 12 }}>
      <CheckCircle size={52} className="success-icon" strokeWidth={1.5} />
      <div className="success-title">Pembayaran Berhasil</div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        Order #{result.orderId}
        {result.customerName && (
          <>
            <span>·</span>
            <User size={12} />
            {result.customerName}
          </>
        )}
      </div>

      {/* Items */}
      <div
        style={{
          width: "100%",
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            padding: "8px 14px",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            borderBottom: "1px solid var(--border)",
          }}
        >
          Item ({result.items.length})
        </div>
        {result.items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 14px",
              fontSize: 13,
              borderBottom:
                i < result.items.length - 1
                  ? "1px solid var(--border)"
                  : "none",
            }}
          >
            <span>
              {item.name}{" "}
              <span style={{ color: "var(--text-muted)" }}>×{item.qty}</span>
            </span>
            <span style={{ fontWeight: 600 }}>
              Rp{fmt(item.price * item.qty)}
            </span>
          </div>
        ))}
      </div>

      {/* Payment summary */}
      <div
        style={{
          width: "100%",
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-md)",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>Total</span>
          <span className="success-total" style={{ fontSize: 18 }}>
            Rp{fmt(result.total)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>Metode</span>
          <span style={{ fontWeight: 600 }}>{result.paymentMethod}</span>
        </div>
        {result.paymentMethod === "Cash" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Diterima</span>
              <span style={{ fontWeight: 600 }}>
                Rp{fmt(result.paidAmount)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                borderTop: "1px solid var(--border)",
                paddingTop: 8,
                marginTop: 2,
              }}
            >
              <span style={{ fontWeight: 700 }}>Kembalian</span>
              <span className="success-change" style={{ fontSize: 18 }}>
                Rp{fmt(result.change)}
              </span>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1 }}
          onClick={onViewOrders}
        >
          <ClipboardList size={14} /> Riwayat
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 2 }}
          onClick={onNewTransaction}
        >
          <RotateCcw size={14} /> Transaksi Baru
        </button>
      </div>
    </div>
  );
}
