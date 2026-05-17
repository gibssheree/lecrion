// apps/pos-web/src/features/cart/CartItem.tsx
// Phase 12: Enterprise UI polish — cleaner layout, better visual hierarchy

import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore, CartItem as CartItemType } from "../../store/cart.store";

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

interface Props {
  item: CartItemType;
}

export default function CartItem({ item }: Props) {
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);

  const lineTotal = item.price * item.qty;
  const atMax = item.isStockTracked && item.qty >= item.stock;

  return (
    <div className="cart-item">
      {/* Info */}
      <div className="cart-item-info">
        <div className="cart-item-name" title={item.name}>
          {item.name}
        </div>
        <div className="cart-item-price">
          Rp{fmt(item.price)} × {item.qty}
        </div>
      </div>

      {/* Qty adjuster */}
      <div className="qty-adjuster">
        <button
          className="qty-btn"
          onClick={() => updateQty(item.productId, item.qty - 1)}
          aria-label="Kurangi"
          title="Kurangi"
        >
          <Minus size={11} strokeWidth={2.5} />
        </button>
        <span className="qty-value">{item.qty}</span>
        <button
          className="qty-btn"
          onClick={() => updateQty(item.productId, item.qty + 1)}
          disabled={atMax}
          aria-label="Tambah"
          title={atMax ? `Stok maks ${item.stock}` : "Tambah"}
        >
          <Plus size={11} strokeWidth={2.5} />
        </button>
      </div>

      {/* Line total */}
      <div className="cart-item-total">Rp{fmt(lineTotal)}</div>

      {/* Remove */}
      <button
        className="cart-remove-btn"
        onClick={() => removeItem(item.productId)}
        aria-label={`Hapus ${item.name}`}
        title="Hapus"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
