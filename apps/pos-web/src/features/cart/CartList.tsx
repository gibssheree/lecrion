import { ShoppingCart } from "lucide-react";
import { useCartStore } from "../../store/cart.store";
import CartItem from "./CartItem";

export default function CartList() {
  const items = useCartStore((s) => s.items);

  if (!items.length) {
    return (
      <div className="loading-center" style={{ padding: 32 }}>
        <ShoppingCart size={36} color="var(--text-muted)" />
        <span
          style={{
            color: "var(--text-muted)",
            textAlign: "center",
            fontSize: 13,
          }}
        >
          Keranjang kosong
          <br />
          Pilih produk di sebelah kiri
        </span>
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
