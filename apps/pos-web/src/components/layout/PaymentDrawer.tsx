// apps/pos-web/src/components/layout/PaymentDrawer.tsx
//
// Phase 7 additions:
//   • Customer drawer (search/create customer, show loyalty points)
//   • PromoInput (voucher code apply)
//   • Promo discount takes precedence over manual discount
//   • handleNewTransaction resets customer and promo state

import { useState, useEffect } from "react";
import {
  CreditCard,
  AlertCircle,
  User,
  FileText,
  Tag,
  Percent,
  Info,
  Star,
} from "lucide-react";
import PayButton from "../../features/checkout/PayButton";
import SuccessScreen from "../../features/checkout/SuccessScreen";
import ConfirmModal from "../../features/checkout/ConfirmModal";
import SplitPaymentPanel from "../../features/checkout/SplitPaymentPanel";
import { useCheckout } from "../../features/checkout/useCheckout";
import { useTenderLines } from "../../features/checkout/useTenderLines";
import { useStoreCalcPolicy } from "../../hooks/useStoreCalcPolicy";
import CustomerDrawer, {
  CustomerSummary,
} from "../../features/customers/CustomerDrawer";
import PromoInput from "../../features/customers/PromoInput";

interface Props {
  onOpenOrders: () => void;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

export default function PaymentDrawer({ onOpenOrders }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Phase 7: customer and promo state
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummary | null>(null);
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    discountAmount: number;
    promotionId: number | null;
    voucherCode: string | null;
    description: string;
  } | null>(null);

  const {
    checkout,
    loading,
    error,
    result,
    reset,
    subtotal,
    itemCount,
    items,
  } = useCheckout();

  const { policy } = useStoreCalcPolicy();

  // Phase 7: promo discount takes precedence over manual discount
  const promoDiscount = promoResult?.discountAmount ?? 0;
  const manualDiscount = Math.min(
    Math.max(0, parseFloat(discountInput) || 0),
    subtotal,
  );
  const discountAmount = promoDiscount > 0 ? promoDiscount : manualDiscount;

  const discountReasonMissing =
    discountAmount > 0 && promoDiscount === 0 && !discountReason.trim();

  const discountedSubtotal = subtotal - discountAmount;
  const taxAmount =
    policy && policy.taxMode === "exclusive"
      ? Math.round(discountedSubtotal * policy.taxRate)
      : 0;
  const serviceChargeAmount = policy
    ? Math.round(discountedSubtotal * policy.serviceChargeRate)
    : 0;

  const total = Math.max(
    0,
    discountedSubtotal + taxAmount + serviceChargeAmount,
  );

  const tender = useTenderLines(total);

  useEffect(() => {
    if (tender.lines.length === 1) {
      tender.setSingleMethod(tender.lines[0].method);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.key === "F2" &&
        itemCount > 0 &&
        !loading &&
        !showConfirm &&
        !discountReasonMissing
      ) {
        e.preventDefault();
        if (tender.canPay) setShowConfirm(true);
      }
      if (e.key === "Escape") {
        setShowConfirm(false);
        reset();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount, loading, showConfirm, tender.canPay, discountReasonMissing]);

  function handleConfirm() {
    checkout(
      tender.buildPayments(),
      selectedCustomer?.name || customerName,
      note,
      {
        discountAmount,
        discountReason:
          promoResult?.description || discountReason.trim() || undefined,
        taxAmount,
        serviceChargeAmount,
        customerId: selectedCustomer?.id,
      },
    );
    setShowConfirm(false);
  }

  function handleNewTransaction() {
    reset();
    setCustomerName("");
    setNote("");
    setDiscountInput("");
    setDiscountReason("");
    setShowDiscount(false);
    setSelectedCustomer(null);
    setPromoResult(null);
    tender.reset("Cash");
  }

  if (result) {
    return (
      <div className="panel">
        <SuccessScreen
          result={result}
          onNewTransaction={handleNewTransaction}
          onViewOrders={() => {
            handleNewTransaction();
            onOpenOrders();
          }}
        />
      </div>
    );
  }

  const cashPaidTotal = tender.lines
    .filter((l) => l.method.toLowerCase() === "cash")
    .reduce((sum, l) => {
      const amt = parseFloat(l.amount) || 0;
      return sum + (parseFloat(l.paidAmount) || amt);
    }, 0);

  const canPay = itemCount > 0 && tender.canPay && !discountReasonMissing;
  const hasTaxOrSc =
    policy && (policy.taxRate > 0 || policy.serviceChargeRate > 0);

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <CreditCard size={14} /> Pembayaran
        </div>

        {/* Total display */}
        <div className="total-display">
          <div className="total-label">TOTAL PEMBAYARAN</div>
          <div className="total-amount">
            {itemCount > 0 ? `Rp${fmt(total)}` : "Rp0"}
          </div>

          {itemCount > 0 &&
            (discountAmount > 0 ||
              taxAmount > 0 ||
              serviceChargeAmount > 0) && (
              <div className="total-breakdown">
                <div className="total-breakdown-row">
                  <span>Subtotal: Rp{fmt(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div
                    className="total-breakdown-row"
                    style={{ color: "#dc2626" }}
                  >
                    <span>
                      Diskon: −Rp{fmt(discountAmount)}
                      {promoResult && (
                        <span
                          style={{ fontSize: 10, marginLeft: 4, opacity: 0.8 }}
                        >
                          ({promoResult.voucherCode ?? "promo"})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="total-breakdown-row">
                    <span>
                      Pajak ({policy ? Math.round(policy.taxRate * 100) : 0}%):
                      +Rp{fmt(taxAmount)}
                    </span>
                  </div>
                )}
                {serviceChargeAmount > 0 && (
                  <div className="total-breakdown-row">
                    <span>
                      Service (
                      {policy ? Math.round(policy.serviceChargeRate * 100) : 0}
                      %): +Rp{fmt(serviceChargeAmount)}
                    </span>
                  </div>
                )}
              </div>
            )}

          {itemCount > 0 && (
            <div
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}
            >
              {itemCount} item
            </div>
          )}
        </div>

        <div
          className="panel-body"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {itemCount > 0 && <SplitPaymentPanel tender={tender} total={total} />}

          {itemCount > 0 && hasTaxOrSc && discountAmount === 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              <Info size={11} />
              {policy!.taxRate > 0 && (
                <span>Pajak {Math.round(policy!.taxRate * 100)}%</span>
              )}
              {policy!.taxRate > 0 && policy!.serviceChargeRate > 0 && (
                <span>·</span>
              )}
              {policy!.serviceChargeRate > 0 && (
                <span>
                  Service {Math.round(policy!.serviceChargeRate * 100)}%
                </span>
              )}
              <span style={{ marginLeft: "auto" }}>
                sudah termasuk dalam total
              </span>
            </div>
          )}

          {/* Manual discount (only when no promo applied) */}
          {itemCount > 0 && promoDiscount === 0 && (
            <div>
              <button
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: 12,
                  color: showDiscount ? "var(--primary)" : "var(--text-muted)",
                  padding: "4px 0",
                  gap: 5,
                }}
                onClick={() => {
                  setShowDiscount((v) => !v);
                  if (showDiscount) {
                    setDiscountInput("");
                    setDiscountReason("");
                  }
                }}
              >
                <Tag size={12} />
                {showDiscount ? "Hapus Diskon" : "Tambah Diskon"}
              </button>

              {showDiscount && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div>
                    <label
                      className="form-label"
                      style={{ display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <Percent size={12} /> Diskon (Rp)
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      max={subtotal}
                      step="1000"
                      placeholder={`Maks Rp${fmt(subtotal)}`}
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        textAlign: "right",
                      }}
                    />
                    {discountAmount > 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#dc2626",
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        Diskon Rp{fmt(discountAmount)} → Total Rp{fmt(total)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      className="form-label"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        color: discountReasonMissing ? "#dc2626" : undefined,
                      }}
                    >
                      <FileText size={12} />
                      Alasan Diskon
                      {discountAmount > 0 && (
                        <span style={{ color: "#dc2626", marginLeft: 2 }}>
                          *
                        </span>
                      )}
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Contoh: Member, Promo hari ini, Kompensasi…"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      style={{
                        fontSize: 13,
                        borderColor: discountReasonMissing
                          ? "#fca5a5"
                          : undefined,
                      }}
                    />
                    {discountReasonMissing && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#dc2626",
                          marginTop: 3,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <AlertCircle size={11} />
                        Alasan diskon wajib diisi
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voucher / Promo — Phase 7 */}
          {itemCount > 0 && manualDiscount === 0 && (
            <PromoInput
              orderTotal={subtotal}
              onApply={setPromoResult}
              applied={promoResult}
            />
          )}

          {/* Customer — Phase 7 */}
          {itemCount > 0 && (
            <div>
              <label
                className="form-label"
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <User size={12} /> Pelanggan (opsional)
              </label>
              {selectedCustomer ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    background: "var(--color-primary-light, #eff6ff)",
                    border: "1px solid var(--color-primary, #2563eb)",
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                  onClick={() => setShowCustomerDrawer(true)}
                >
                  <User size={13} color="var(--color-primary, #2563eb)" />
                  <span style={{ flex: 1, fontWeight: 500 }}>
                    {selectedCustomer.name}
                  </span>
                  {selectedCustomer.pointBalance != null &&
                    selectedCustomer.pointBalance > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#d97706",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Star size={11} /> {selectedCustomer.pointBalance} pts
                      </span>
                    )}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="form-input"
                    placeholder="Pelanggan umum"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ fontSize: 13, flex: 1 }}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 12, whiteSpace: "nowrap" }}
                    onClick={() => setShowCustomerDrawer(true)}
                  >
                    <User size={12} /> Cari
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Note */}
          {itemCount > 0 && (
            <div>
              <label
                className="form-label"
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <FileText size={12} /> Catatan (opsional)
              </label>
              <input
                className="form-input"
                placeholder="Catatan pesanan…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
          )}

          {error && (
            <div
              className="alert alert-error"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {itemCount === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
                padding: "20px 0",
              }}
            >
              Tambahkan produk ke keranjang untuk mulai pembayaran
            </div>
          )}
        </div>

        <div className="panel-footer">
          <PayButton
            total={total}
            method={
              tender.lines.length === 1 ? tender.lines[0].method : "split"
            }
            paidAmount={cashPaidTotal}
            disabled={!canPay}
            loading={loading}
            onClick={() => setShowConfirm(true)}
          />
          {discountReasonMissing && (
            <div
              style={{
                textAlign: "center",
                fontSize: 11,
                color: "#dc2626",
                marginTop: 4,
              }}
            >
              Isi alasan diskon untuk melanjutkan
            </div>
          )}
          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 6,
            }}
          >
            F2 = Bayar · Esc = Batal
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          items={items}
          subtotal={subtotal}
          total={total}
          discountAmount={discountAmount}
          taxAmount={taxAmount}
          serviceChargeAmount={serviceChargeAmount}
          payments={tender.buildPayments()}
          cashPaidTotal={cashPaidTotal}
          customerName={selectedCustomer?.name || customerName}
          note={note}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* Phase 7: Customer drawer */}
      {showCustomerDrawer && (
        <CustomerDrawer
          selectedCustomer={selectedCustomer}
          onSelect={(c) => {
            setSelectedCustomer(c);
            if (c) setCustomerName(c.name);
          }}
          onClose={() => setShowCustomerDrawer(false)}
        />
      )}
    </>
  );
}
