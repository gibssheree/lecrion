// apps/pos-web/src/features/cart/CartSummary.tsx
// Phase 12: Enterprise UI polish — cleaner summary with item count badge

import { Trash2 } from "lucide-react";
import { useCartStore } from "../../store/cart.store";

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

export default function CartSummary() {
  const subtotal = useCartStore((s) => s.subtotal);
  const itemCount = useCartStore((s) => s.itemCount);
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  const lineCount = items.length;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginBottom: 2,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span
            style={{
              background: "var(--primary)",
              color: "#fff",
              borderRadius: "10px",
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 6px",
              minWidth: 18,
              textAlign: "center",
              display: "inline-block",
            }}
          >
            {itemCount}
          </span>
          item · {lineCount} produk
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.3px",
          }}
        >
          Rp{fmt(subtotal)}
        </div>
      </div>

      {itemCount > 0 && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={clear}
          style={{
            color: "var(--danger)",
            borderColor: "var(--stock-out-border)",
            gap: 4,
          }}
          title="Kosongkan keranjang"
        >
          <Trash2 size={12} /> Kosongkan
        </button>
      )}
    </div>
  );
}
