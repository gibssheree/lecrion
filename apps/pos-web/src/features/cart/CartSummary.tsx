import { Trash2 } from "lucide-react";
import { useCartStore } from "../../store/cart.store";

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

export default function CartSummary() {
  const subtotal = useCartStore((s) => s.subtotal);
  const itemCount = useCartStore((s) => s.itemCount);
  const clear = useCartStore((s) => s.clear);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {itemCount} item
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-primary)",
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
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "var(--danger)",
          }}
        >
          <Trash2 size={13} /> Kosongkan
        </button>
      )}
    </div>
  );
}
