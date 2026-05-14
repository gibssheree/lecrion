import { useState } from "react";
import { useCartStore } from "../../store/cart.store";
import { useAuthStore } from "../../store/auth.store";
import { posCheckout, recordPayment, confirmPayment } from "../../services/api";

export interface CheckoutResult {
  orderId: number;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  change: number;
  customerName: string;
  items: Array<{ name: string; qty: number; price: number }>;
}

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal);
  const clear = useCartStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);

  async function checkout(
    paymentMethod: string,
    paidAmount: number,
    customerName = "",
    note = "",
  ) {
    if (!items.length) {
      setError("Keranjang kosong");
      return;
    }
    if (paymentMethod === "Cash" && paidAmount < subtotal) {
      setError("Uang diterima kurang dari total");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create order via POS checkout endpoint
      const orderRes = await posCheckout({
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          qty: i.qty,
        })),
        paymentMethod,
        cashierId: user?.actor ?? "kasir",
        customerName: customerName || undefined,
        note: note || undefined,
      });

      // 2. Record payment
      const payRes = await recordPayment({
        orderId: orderRes.orderId,
        amount: orderRes.total,
        paymentMethod,
      });

      // 3. Confirm payment
      await confirmPayment({
        paymentId: payRes.paymentId,
        paidAmount: paymentMethod === "Cash" ? paidAmount : orderRes.total,
      });

      const checkoutResult: CheckoutResult = {
        orderId: orderRes.orderId,
        total: orderRes.total,
        paymentMethod,
        paidAmount: paymentMethod === "Cash" ? paidAmount : orderRes.total,
        change: paymentMethod === "Cash" ? paidAmount - orderRes.total : 0,
        customerName,
        items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      };

      setResult(checkoutResult);
      clear();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout gagal");
    } finally {
      setLoading(false);
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
