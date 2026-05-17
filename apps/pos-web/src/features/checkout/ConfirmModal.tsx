import { X, CreditCard, User, FileText, ShoppingBag } from "lucide-react";
import { CartItem } from "../../store/cart.store";
import { PaymentLineInput } from "./useCheckout";

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

interface Props {
  items: CartItem[];
  subtotal: number;
  /** Final total after discount/tax/service charge */
  total: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  payments: PaymentLineInput[];
  /** Total cash physically received (for change display) */
  cashPaidTotal: number;
  customerName: string;
  note: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  items,
  subtotal,
  total,
  discountAmount,
  taxAmount,
  serviceChargeAmount,
  payments,
  cashPaidTotal,
  customerName,
  note,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const hasCash = payments.some((p) => p.method.toLowerCase() === "cash");
  const change = hasCash ? Math.max(0, cashPaidTotal - total) : 0;
  const isSplit = payments.length > 1;
  const hasDiscount = discountAmount > 0;
  const hasTax = taxAmount > 0;
  const hasSC = serviceChargeAmount > 0;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        style={{ maxWidth: 480, maxHeight: "90vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ShoppingBag size={18} color="var(--primary)" /> Konfirmasi
            Pembayaran
          </h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            style={{ padding: "4px 8px" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Customer & note */}
        {(customerName || note) && (
          <div
            style={{
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              marginBottom: 14,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {customerName && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                }}
              >
                <User size={13} color="var(--text-muted)" />
                <span style={{ color: "var(--text-muted)" }}>Pelanggan:</span>
                <span style={{ fontWeight: 600 }}>{customerName}</span>
              </div>
            )}
            {note && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                }}
              >
                <FileText size={13} color="var(--text-muted)" />
                <span style={{ color: "var(--text-muted)" }}>Catatan:</span>
                <span>{note}</span>
              </div>
            )}
          </div>
        )}

        {/* Items list */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              padding: "8px 14px",
              background: "var(--bg-elevated)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Item Pesanan ({items.length} produk)
          </div>
          {items.map((item) => (
            <div
              key={item.productId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderTop: "1px solid var(--border)",
                fontSize: 13,
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Rp{fmt(item.price)} × {item.qty}
                </div>
              </div>
              <div style={{ fontWeight: 700 }}>
                Rp{fmt(item.price * item.qty)}
              </div>
            </div>
          ))}
        </div>

        {/* Payment summary */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          {/* Subtotal */}
          <SummaryRow label="Subtotal" value={`Rp${fmt(subtotal)}`} />

          {/* Discount */}
          {hasDiscount && (
            <SummaryRow
              label="Diskon"
              value={`−Rp${fmt(discountAmount)}`}
              valueColor="#dc2626"
            />
          )}

          {/* Tax */}
          {hasTax && <SummaryRow label="Pajak" value={`Rp${fmt(taxAmount)}`} />}

          {/* Service charge */}
          {hasSC && (
            <SummaryRow
              label="Service Charge"
              value={`Rp${fmt(serviceChargeAmount)}`}
            />
          )}

          {/* Total */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 14px",
              fontSize: 16,
              fontWeight: 800,
              background: "var(--primary-light)",
              color: "var(--primary-dark)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <span>TOTAL</span>
            <span>Rp{fmt(total)}</span>
          </div>

          {/* Payment lines */}
          {isSplit ? (
            <>
              <div
                style={{
                  padding: "6px 14px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  borderTop: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                }}
              >
                Rincian Pembayaran
              </div>
              {payments.map((p, i) => {
                const isCashLine = p.method.toLowerCase() === "cash";
                const paid = isCashLine ? (p.paidAmount ?? p.amount) : p.amount;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 14px",
                      fontSize: 13,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <CreditCard size={12} color="var(--text-muted)" />
                      {p.method}
                      {p.reference && (
                        <span
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          ({p.reference})
                        </span>
                      )}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      Rp{fmt(p.amount)}
                      {isCashLine && paid > p.amount && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginLeft: 4,
                          }}
                        >
                          (terima Rp{fmt(paid)})
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <SummaryRow
                label={
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <CreditCard size={13} /> Metode
                  </span>
                }
                value={payments[0]?.method ?? "—"}
              />
              {hasCash && (
                <SummaryRow
                  label="Uang Diterima"
                  value={`Rp${fmt(cashPaidTotal)}`}
                />
              )}
            </>
          )}

          {/* Change */}
          {hasCash && change >= 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 14px",
                fontSize: 14,
                background:
                  change >= 0 ? "var(--stock-ok-bg)" : "var(--stock-out-bg)",
                borderTop: "1px solid var(--border)",
              }}
            >
              <span style={{ fontWeight: 700 }}>Kembalian</span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 16,
                  color: change >= 0 ? "var(--stock-ok)" : "var(--stock-out)",
                }}
              >
                Rp{fmt(change)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={onCancel}
            disabled={loading}
          >
            Batal
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2, fontSize: 15, fontWeight: 700 }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16 }} />{" "}
                Memproses…
              </>
            ) : (
              <>
                <CreditCard size={16} /> Konfirmasi & Bayar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueColor,
}: {
  label: React.ReactNode;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 14px",
        fontSize: 13,
        borderTop: "1px solid var(--border)",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );
}
