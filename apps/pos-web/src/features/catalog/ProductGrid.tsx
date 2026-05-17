// apps/pos-web/src/features/catalog/ProductGrid.tsx
//
// Phase 6A fix: Product interface now includes all fields that ProductCard needs.
// Previously isStockTracked, unitName, productType, sku, barcode were missing
// from the grid's Product interface, so ProductCard received undefined for them.

import { Package, Barcode } from "lucide-react";
import ProductCard from "./ProductCard";

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category?: string;
  categoryId?: number | null;
  categoryName?: string | null;
  available?: boolean;
  isStockTracked?: boolean;
  unitName?: string | null;
  productType?: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
}

interface Props {
  products: Product[];
  loading: boolean;
  search: string;
  /** When true, show a barcode-mode indicator instead of normal empty state */
  isBarcodeMode?: boolean;
}

export default function ProductGrid({
  products,
  loading,
  search,
  isBarcodeMode,
}: Props) {
  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
        <span>Memuat produk…</span>
      </div>
    );
  }

  if (!products.length) {
    if (isBarcodeMode) {
      return (
        <div className="loading-center">
          <Barcode size={36} color="var(--text-muted)" />
          <span style={{ color: "var(--text-muted)" }}>
            Barcode <code style={{ fontFamily: "monospace" }}>{search}</code>{" "}
            tidak ditemukan
          </span>
        </div>
      );
    }
    return (
      <div className="loading-center">
        <Package size={36} color="var(--text-muted)" />
        <span style={{ color: "var(--text-muted)" }}>
          {search ? `Tidak ada produk untuk "${search}"` : "Belum ada produk"}
        </span>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
