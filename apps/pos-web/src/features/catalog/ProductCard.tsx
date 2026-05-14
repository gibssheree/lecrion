import { Plus } from "lucide-react";
import { useCartStore } from "../../store/cart.store";

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category?: string;
}

interface Props {
  product: Product;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0)
    return <span className="stock-badge stock-badge--out">Habis</span>;
  if (stock <= 5)
    return <span className="stock-badge stock-badge--low">Stok {stock}</span>;
  return <span className="stock-badge stock-badge--ok">Stok {stock}</span>;
}

export default function ProductCard({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const inCart = cartItems.find((i) => i.productId === product.id);
  const isOut = product.stock <= 0;
  const isLow = product.stock > 0 && product.stock <= 5;

  function handleAdd() {
    if (isOut) return;
    addItem(product);
  }

  return (
    <div
      className={`product-card ${isOut ? "product-card--disabled" : ""} ${isLow ? "product-card--low-stock" : ""}`}
      onClick={handleAdd}
      role="button"
      tabIndex={isOut ? -1 : 0}
      onKeyDown={(e) => e.key === "Enter" && handleAdd()}
    >
      <div className="product-name">{product.name}</div>
      <div className="product-price">Rp{fmt(product.price)}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
        }}
      >
        <StockBadge stock={product.stock} />
        {!isOut && (
          <button
            className="btn btn-primary btn-sm"
            style={{ padding: "4px 10px", minHeight: 30, fontSize: 12 }}
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
          >
            {inCart ? (
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Plus size={12} /> {inCart.qty}
              </span>
            ) : (
              <Plus size={14} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
