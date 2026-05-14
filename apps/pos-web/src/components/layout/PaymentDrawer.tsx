import { useState, useEffect } from "react";
import { CreditCard, AlertCircle, User, FileText } from "lucide-react";
import PaymentMethodSelector from "../../features/checkout/PaymentMethodSelector";
import CashInput from "../../features/checkout/CashInput";
import PayButton from "../../features/checkout/PayButton";
import SuccessScreen from "../../features/checkout/SuccessScreen";
import ConfirmModal from "../../features/checkout/ConfirmModal";
import { useCheckout } from "../../features/checkout/useCheckout";

interface Props {
  onOpenOrders: () => void;
}

export default function PaymentDrawer({ onOpenOrders }: Props) {
  const [method, setMethod] = useState("Cash");
  const [received, setReceived] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

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

  // F2 shortcut to open confirm modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F2" && itemCount > 0 && !loading && !showConfirm) {
        e.preventDefault();
        if (canPay) setShowConfirm(true);
      }
      if (e.key === "Escape") {
        setShowConfirm(false);
        reset();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount, loading, method, received, subtotal, showConfirm]);

  function handleConfirm() {
    const paidAmount = method === "Cash" ? Number(received) || 0 : subtotal;
    checkout(method, paidAmount, customerName, note);
    setShowConfirm(false);
  }

  function handleNewTransaction() {
    reset();
    setReceived("");
    setMethod("Cash");
    setCustomerName("");
    setNote("");
  }

  // Show success screen after payment
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

  const isCashInsufficient =
    method === "Cash" && received !== "" && Number(received) < subtotal;
  const canPay =
    itemCount > 0 && (method !== "Cash" || Number(received) >= subtotal);

  const paidAmount = method === "Cash" ? Number(received) || 0 : subtotal;

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <CreditCard size={14} /> Pembayaran
        </div>

        {/* Total */}
        <div className="total-display">
          <div className="total-label">TOTAL PEMBAYARAN</div>
          <div className="total-amount">
            {itemCount > 0
              ? `Rp${new Intl.NumberFormat("id-ID").format(subtotal)}`
              : "Rp0"}
          </div>
          {itemCount > 0 && (
            <div
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}
            >
              {itemCount} item
            </div>
          )}
        </div>

        <div
          className="panel-body"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* Payment method */}
          <PaymentMethodSelector
            value={method}
            onChange={(m) => {
              setMethod(m);
              setReceived("");
            }}
          />

          {/* Cash input */}
          {method === "Cash" && itemCount > 0 && (
            <CashInput
              total={subtotal}
              received={received}
              onChange={setReceived}
            />
          )}

          {/* Customer name */}
          {itemCount > 0 && (
            <div>
              <label
                className="form-label"
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <User size={12} /> Nama Pelanggan (opsional)
              </label>
              <input
                className="form-input"
                placeholder="Pelanggan umum"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ fontSize: 13 }}
              />
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

          {/* Error */}
          {error && (
            <div
              className="alert alert-error"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Empty cart hint */}
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

        {/* Pay button */}
        <div className="panel-footer">
          <PayButton
            total={subtotal}
            disabled={!canPay || isCashInsufficient}
            loading={loading}
            onClick={() => setShowConfirm(true)}
          />
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

      {/* Confirmation modal */}
      {showConfirm && (
        <ConfirmModal
          items={items}
          subtotal={subtotal}
          paymentMethod={method}
          paidAmount={paidAmount}
          customerName={customerName}
          note={note}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
