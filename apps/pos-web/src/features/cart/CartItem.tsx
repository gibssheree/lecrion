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

  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <div className="cart-item-name">{item.name}</div>
        <div className="cart-item-price">
          Rp{fmt(item.price)} × {item.qty} ={" "}
          <strong>Rp{fmt(item.price * item.qty)}</strong>
        </div>
      </div>

      <div className="qty-adjuster">
        <button
          className="qty-btn"
          onClick={() => updateQty(item.productId, item.qty - 1)}
        >
          <Minus size={12} />
        </button>
        <span className="qty-value">{item.qty}</span>
        <button
          className="qty-btn"
          onClick={() => updateQty(item.productId, item.qty + 1)}
          disabled={item.qty >= item.stock}
        >
          <Plus size={12} />
        </button>
      </div>

      <button
        onClick={() => removeItem(item.productId)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          padding: "4px",
          display: "flex",
        }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
