import { useRef, useState } from "react";
import { useCartStore } from "../../store/cart.store";
import { useAuthStore } from "../../store/auth.store";
import { useRegisterStore } from "../../store/register.store";
import {
  createPosSale,
  earnLoyaltyPoints,
  PosSaleReceipt,
} from "../../services/api";
import { enqueueSale, cacheReceipt } from "../../services/offline-db";

export type CheckoutResult = PosSaleReceipt;

export interface PaymentLineInput {
  method: string;
  amount: number;
  paidAmount?: number;
  reference?: string;
}

export interface CheckoutAdjustments {
  discountAmount?: number;
  discountReason?: string;
  taxAmount?: number;
  serviceChargeAmount?: number;
  /** Phase 7: customer ID for loyalty points */
  customerId?: number;
}

function generateClientSaleId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `sale-${crypto.randomUUID()}`;
  }
  return `sale-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const pendingSaleIdRef = useRef<string | null>(null);

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal);
  const orderType = useCartStore((s) => s.orderType);
  const channel = useCartStore((s) => s.channel);
  const externalOrderId = useCartStore((s) => s.externalOrderId);
  const courierName = useCartStore((s) => s.courierName);
  const clear = useCartStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const registerSession = useRegisterStore((s) => s.session);

  /**
   * checkout — accepts an array of payment lines for split payment support.
   * Single-method callers pass a one-element array.
   */
  async function checkout(
    payments: PaymentLineInput[],
    customerName = "",
    note = "",
    adjustments: CheckoutAdjustments = {},
  ) {
    if (!items.length) {
      setError("Keranjang kosong");
      return;
    }
    if (!payments.length) {
      setError("Pilih metode pembayaran");
      return;
    }
    if (!registerSession?.id) {
      setError("Sesi kasir belum aktif");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const clientSaleId = pendingSaleIdRef.current ?? generateClientSaleId();
      pendingSaleIdRef.current = clientSaleId;

      const salePayload = {
        clientSaleId,
        registerSessionId: registerSession.id,
        storeId: registerSession.store_id,
        cashierId: user?.actor ?? "kasir",
        orderType,
        channel: channel || undefined,
        externalOrderId: externalOrderId || undefined,
        courierName: courierName || undefined,
        customerName: customerName || undefined,
        note: note || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          qty: i.qty,
          unitPrice: i.price,
        })),
        payments,
        discountAmount: adjustments.discountAmount || undefined,
        discountReason: adjustments.discountReason || undefined,
        taxAmount: adjustments.taxAmount || undefined,
        serviceChargeAmount: adjustments.serviceChargeAmount || undefined,
      };

      let receipt: PosSaleReceipt;

      if (!navigator.onLine) {
        // Phase 8: offline — queue the sale and return a local receipt
        await enqueueSale({
          clientSaleId,
          payload: salePayload,
          queuedAt: Date.now(),
        });
        // Create a local receipt placeholder
        receipt = {
          saleId: clientSaleId,
          orderId: 0,
          receiptNumber: `OFFLINE-${clientSaleId.slice(-8).toUpperCase()}`,
          registerSessionId: registerSession.id,
          cashierId: user?.actor ?? "kasir",
          customerName: customerName || "",
          subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
          discountAmount: adjustments.discountAmount ?? 0,
          taxAmount: adjustments.taxAmount ?? 0,
          serviceChargeAmount: adjustments.serviceChargeAmount ?? 0,
          total: payments.reduce((s, p) => s + p.amount, 0),
          paidTotal: payments.reduce(
            (s, p) => s + (p.paidAmount ?? p.amount),
            0,
          ),
          change: 0,
          paymentMethods: payments.map((p) => p.method),
          paymentLines: payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            paidAmount: p.paidAmount ?? p.amount,
          })),
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            qty: i.qty,
            unitPrice: i.price,
            lineTotal: i.price * i.qty,
          })),
          createdAt: new Date().toISOString(),
        } as any;
        setError(
          "⚠️ Offline — transaksi disimpan dan akan disinkronkan saat online",
        );
      } else {
        receipt = await createPosSale(salePayload);
        // Phase 8: cache receipt for offline viewing
        cacheReceipt(receipt).catch(() => {});
      }

      setResult(receipt);
      clear();

      // Phase 7: earn loyalty points post-sale (non-blocking)
      if (adjustments.customerId && receipt.total > 0) {
        earnLoyaltyPoints(
          adjustments.customerId,
          receipt.total,
          receipt.orderId,
          registerSession.store_id,
        ).catch(() => {
          // Non-critical — points earn failure does not affect the sale
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout gagal");
    } finally {
      setLoading(false);
      pendingSaleIdRef.current = null;
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return {
    checkout,
    loading,
    error,
    result,
    reset,
    subtotal,
    itemCount: items.length,
    items,
  };
}
