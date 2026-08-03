import { useRef } from "react";
import {
  CheckCircle,
  RotateCcw,
  ClipboardList,
  User,
  Printer,
} from "lucide-react";
import { PosSaleReceipt } from "../../services/api";

// PosSaleReceipt is the canonical receipt shape from the backend.
// CheckoutResult is aliased to PosSaleReceipt in useCheckout.ts.
export type { PosSaleReceipt as CheckoutResult };

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(Number(n ?? 0)));
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface Props {
  result: PosSaleReceipt;
  onNewTransaction: () => void;
  onViewOrders: () => void;
}

export default function SuccessScreen({
  result,
  onNewTransaction,
  onViewOrders,
}: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const paymentMethodsLabel = result.paymentMethods?.join(", ") ?? "—";
  const hasCashPayment = result.paymentMethods?.some(
    (m) => m.toLowerCase() === "cash",
  );

  const hasDiscount = (result.discountAmount ?? 0) > 0;
  const hasTax = (result.taxAmount ?? 0) > 0;
  const hasServiceCharge = (result.serviceChargeAmount ?? 0) > 0;

  function handlePrint() {
    const receiptHtml = receiptRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Struk #${result.receiptNumber || result.orderId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; padding: 12px; width: 300px; }
    .receipt-header { text-align: center; margin-bottom: 10px; }
    .receipt-header h2 { font-size: 15px; font-weight: 700; }
    .receipt-header p { font-size: 11px; color: #555; }
    .divider { border: none; border-top: 1px dashed #999; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; }
    .row.bold { font-weight: 700; }
    .row.total { font-size: 14px; font-weight: 800; border-top: 1px solid #000; padding-top: 6px; margin-top: 4px; }
    .row.change { font-size: 14px; font-weight: 800; color: #166534; }
    .item-name { flex: 1; }
    .item-qty { width: 30px; text-align: center; }
    .item-price { text-align: right; }
    .footer { text-align: center; margin-top: 12px; font-size: 11px; color: #555; }
    @media print { body { width: 100%; } }
  </style>
</head>
<body>
  ${receiptHtml}
  <script>window.onload = function(){ window.print(); window.close(); }<\/script>
</body>
</html>`);
    win.document.close();
  }

  return (
    <div className="success-screen" style={{ padding: "20px 16px", gap: 10 }}>
      <CheckCircle size={44} className="success-icon" strokeWidth={1.5} />
      <div className="success-title" style={{ fontSize: 18 }}>
        Pembayaran Berhasil
      </div>

      {/* Receipt area — this is what gets printed */}
      <div
        ref={receiptRef}
        style={{
          width: "100%",
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        {/* Receipt header */}
        <div
          className="receipt-header"
          style={{
            padding: "12px 14px 10px",
            borderBottom: "1px dashed var(--border)",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            STRUK PEMBAYARAN
          </h2>
          {result.receiptNumber && (
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--primary)",
                marginBottom: 2,
              }}
            >
              #{result.receiptNumber}
            </p>
          )}
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {result.createdAt ? fmtDate(result.createdAt) : ""}
          </p>
        </div>

        {/* Meta info */}
        <div
          style={{
            padding: "8px 14px",
            borderBottom: "1px dashed var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <div
            className="row"
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <span>Order</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              #{result.orderId}
            </span>
          </div>
          {result.cashierId && (
            <div
              className="row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              <span>Kasir</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {result.cashierId}
              </span>
            </div>
          )}
          {result.registerSessionId && (
            <div
              className="row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              <span>Sesi</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                #{result.registerSessionId}
              </span>
            </div>
          )}
          {result.customerName && (
            <div
              className="row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              <span>
                <User size={10} style={{ display: "inline", marginRight: 3 }} />
                Pelanggan
              </span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {result.customerName}
              </span>
            </div>
          )}
          {result.channel && result.channel !== "in_store" && (
            <div
              className="row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              <span>Channel Online</span>
              <span style={{ fontWeight: 700, color: "var(--primary)", textTransform: "capitalize" }}>
                {result.channel} {result.externalOrderId ? `(#${result.externalOrderId})` : ""}
              </span>
            </div>
          )}
          {result.courierName && (
            <div
              className="row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              <span>Kurir / Ekspedisi</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                {result.courierName}
              </span>
            </div>
          )}
        </div>

        {/* Item lines */}
        <div style={{ borderBottom: "1px dashed var(--border)" }}>
          <div
            style={{
              padding: "6px 14px 4px",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Item ({result.items?.length ?? 0})
          </div>
          {(result.items ?? []).map((item, i) => (
            <div
              key={`${item.productId}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "5px 14px",
                fontSize: 12,
                borderBottom:
                  i < (result.items?.length ?? 0) - 1
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {item.qty} × Rp{fmt(item.unitPrice)}
                </div>
              </div>
              <span style={{ fontWeight: 600, marginLeft: 8, flexShrink: 0 }}>
                Rp{fmt(item.lineTotal)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div
          style={{
            padding: "8px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <span>Subtotal</span>
            <span>Rp{fmt(result.subtotal)}</span>
          </div>

          {hasDiscount && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#dc2626",
              }}
            >
              <span>Diskon</span>
              <span>−Rp{fmt(result.discountAmount)}</span>
            </div>
          )}

          {hasTax && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              <span>Pajak</span>
              <span>Rp{fmt(result.taxAmount)}</span>
            </div>
          )}

          {hasServiceCharge && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              <span>Service Charge</span>
              <span>Rp{fmt(result.serviceChargeAmount)}</span>
            </div>
          )}

          {/* Total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 15,
              fontWeight: 800,
              borderTop: "1px solid var(--border)",
              paddingTop: 6,
              marginTop: 2,
            }}
          >
            <span>Total</span>
            <span className="success-total">Rp{fmt(result.total)}</span>
          </div>

          {/* Payment method */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <span>Metode</span>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              {paymentMethodsLabel}
            </span>
          </div>

          {/* Split payment lines — show when more than one method */}
          {(result.paymentLines?.length ?? 0) > 1 &&
            result.paymentLines.map((pl, i) => {
              const isLineCash = pl.method.toLowerCase() === "cash";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    paddingLeft: 8,
                  }}
                >
                  <span>
                    └ {pl.method}
                    {pl.reference ? ` (${pl.reference})` : ""}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    Rp{fmt(pl.amount)}
                    {isLineCash && pl.paidAmount > pl.amount && (
                      <span style={{ fontWeight: 400, marginLeft: 4 }}>
                        terima Rp{fmt(pl.paidAmount)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}

          {/* Paid / change — only for cash */}
          {hasCashPayment && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                <span>Diterima</span>
                <span style={{ fontWeight: 600 }}>
                  Rp{fmt(result.paidTotal)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  fontWeight: 800,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 6,
                  marginTop: 2,
                  color: "#166534",
                }}
              >
                <span>Kembalian</span>
                <span className="success-change">Rp{fmt(result.change)}</span>
              </div>
            </>
          )}
        </div>

        {/* Receipt footer */}
        <div
          className="footer"
          style={{
            padding: "8px 14px 10px",
            borderTop: "1px dashed var(--border)",
            textAlign: "center",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          {(result as any).loyaltyPointsEarned > 0 && (
            <div style={{ marginBottom: 6, color: "#d97706", fontWeight: 600 }}>
              ⭐ +{(result as any).loyaltyPointsEarned} poin loyalitas diperoleh
            </div>
          )}
          Terima kasih atas kunjungan Anda
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          width: "100%",
          marginTop: 4,
          flexWrap: "wrap",
        }}
      >
        <button
          className="btn btn-ghost"
          style={{ flex: 1, minWidth: 80 }}
          onClick={handlePrint}
          title="Cetak struk"
        >
          <Printer size={13} /> Cetak
        </button>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, minWidth: 80 }}
          onClick={onViewOrders}
        >
          <ClipboardList size={13} /> Riwayat
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 2, minWidth: 120 }}
          onClick={onNewTransaction}
        >
          <RotateCcw size={13} /> Transaksi Baru
        </button>
      </div>
    </div>
  );
}
