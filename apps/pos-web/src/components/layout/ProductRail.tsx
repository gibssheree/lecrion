// apps/pos-web/src/components/layout/ProductRail.tsx
//
// Phase 6A changes:
//   • Pass isBarcodeMode to ProductGrid and CategoryChips.
//   • Pass onBarcodeSubmit to SearchBar — when Enter is pressed on a barcode,
//     the product is added to cart directly if found.
//   • Bubble stock counts up to PosShell correctly (was using useState instead of useEffect).

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import SearchBar from "../../features/catalog/SearchBar";
import CategoryChips from "../../features/catalog/CategoryChips";
import ProductGrid from "../../features/catalog/ProductGrid";
import QuickProductModal from "../../features/catalog/QuickProductModal";
import { useCategories, useProducts } from "../../hooks/useProducts";
import { useCartStore } from "../../store/cart.store";

interface Props {
  onStockCounts: (low: number, out: number) => void;
}

export default function ProductRail({ onStockCounts }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [showQuickProduct, setShowQuickProduct] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const {
    products,
    loading,
    error,
    lowStockCount,
    outOfStockCount,
    isBarcodeMode,
    allProducts,
    reload,
  } = useProducts(search, category);
  const categories = useCategories();

  // Bubble stock counts up to PosShell for BottomBar
  useEffect(() => {
    onStockCounts(lowStockCount, outOfStockCount);
  }, [lowStockCount, outOfStockCount, onStockCounts]);

  // When barcode scanner submits (Enter pressed), add the resolved product to cart
  function handleBarcodeSubmit(barcode: string) {
    const product = products.find(
      (p) => p.barcode === barcode || String(p.id) === barcode,
    );
    if (product && (product.isStockTracked === false || product.stock > 0)) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        isStockTracked: product.isStockTracked ?? true,
      });
      // Clear search after successful barcode add
      setSearch("");
    }
  }

  return (
    <div className="panel" style={{ background: "var(--bg-base)" }}>
      <SearchBar
        value={search}
        onChange={setSearch}
        onBarcodeSubmit={handleBarcodeSubmit}
      />
      <div style={{ padding: "0 12px 8px", display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowQuickProduct(true)}
          title="Tambah atau edit produk cepat"
        >
          <Plus size={12} /> Produk Cepat
        </button>
      </div>
      <CategoryChips
        active={category}
        onChange={setCategory}
        hidden={isBarcodeMode}
      />

      {error && (
        <div className="alert alert-error" style={{ margin: "8px 12px" }}>
          {error}
        </div>
      )}

      <div className="panel-body">
        <ProductGrid
          products={products}
          loading={loading}
          search={search}
          isBarcodeMode={isBarcodeMode}
        />
      </div>
      {showQuickProduct && (
        <QuickProductModal
          products={allProducts}
          categories={categories.categories}
          onClose={() => setShowQuickProduct(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
