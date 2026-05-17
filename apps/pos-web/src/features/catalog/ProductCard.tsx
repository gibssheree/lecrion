// apps/pos-web/src/features/catalog/ProductCard.tsx
//
// Phase 12: Enterprise UI polish
//   • Richer card with SKU, category, stock badge, in-cart count indicator
//   • Semantic color states: out-of-stock, low-stock, in-cart
//   • Smooth hover/active transitions
//   • Accessible keyboard navigation

import { Plus } from "lucide-react";
import { useCartStore } from "../../store/cart.store";

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category?: string;
  categoryName?: string | null;
  isStockTracked?: boolean;
  unitName?: string | null;
  productType?: string;
  sku?: string | null;
  barcode?: string | null;
}

interface Props {
  product: Product;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

function StockBadge({
  stock,
  isStockTracked,
}: {
  stock: number;
  isStockTracked: boolean;
}) {
  if (!isStockTracked) {
    return <span className="stock-badge stock-badge--service">Layanan</span>;
  }
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

  const isStockTracked = product.isStockTracked ?? true;
  const isOut = isStockTracked && product.stock <= 0;
  const isLow = isStockTracked && product.stock > 0 && product.stock <= 5;
  const categoryLabel = product.categoryName ?? product.category;

  function handleAdd() {
    if (isOut) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      isStockTracked,
    });
  }

  const cardClass = [
    "product-card",
    isOut ? "product-card--disabled" : "",
    isLow ? "product-card--low-stock" : "",
    inCart && !isOut ? "product-card--in-cart" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cardClass}
      onClick={handleAdd}
      role="button"
      tabIndex={isOut ? -1 : 0}
      aria-label={`${product.name}, Rp${fmt(product.price)}${isOut ? ", habis" : ""}`}
      onKeyDown={(e) => e.key === "Enter" && handleAdd()}
    >
      {/* In-cart count badge */}
      {inCart && inCart.qty > 0 && (
        <span className="product-cart-count">{inCart.qty}</span>
      )}

      {/* Product name */}
      <div className="product-name">{product.name}</div>

      {/* SKU / category */}
      {product.sku && <div className="product-sku">{product.sku}</div>}
      {!product.sku && categoryLabel && (
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {categoryLabel}
        </div>
      )}

      {/* Unit */}
      {product.unitName && (
        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
          per {product.unitName}
        </div>
      )}

      {/* Price */}
      <div className="product-price">Rp{fmt(product.price)}</div>

      {/* Footer: stock badge + add button */}
      <div className="product-footer">
        <StockBadge stock={product.stock} isStockTracked={isStockTracked} />

        {!isOut && (
          <button
            className="product-add-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
            aria-label={`Tambah ${product.name}`}
            title={`Tambah ${product.name}`}
          >
            {inCart ? (
              <span style={{ fontSize: 11, fontWeight: 800 }}>
                +{inCart.qty}
              </span>
            ) : (
              <Plus size={14} strokeWidth={2.5} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
