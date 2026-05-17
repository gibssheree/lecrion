// apps/pos-web/src/features/cart/CartList.tsx
// Phase 12: Enterprise UI polish — better empty state, item count header

import { ShoppingCart } from "lucide-react";
import { useCartStore } from "../../store/cart.store";
import CartItem from "./CartItem";

export default function CartList() {
  const items = useCartStore((s) => s.items);

  if (!items.length) {
    return (
      <div className="loading-center" style={{ padding: "32px 16px" }}>
        <ShoppingCart size={32} color="var(--text-muted)" strokeWidth={1.5} />
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              color: "var(--text-secondary)",
              fontWeight: 600,
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            Keranjang kosong
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Pilih produk di sebelah kiri
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {items.map((item) => (
        <CartItem key={item.productId} item={item} />
      ))}
    </div>
  );
}
