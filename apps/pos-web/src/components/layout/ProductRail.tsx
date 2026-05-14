import { useState } from "react";
import SearchBar from "../../features/catalog/SearchBar";
import CategoryChips from "../../features/catalog/CategoryChips";
import ProductGrid from "../../features/catalog/ProductGrid";
import { useProducts } from "../../hooks/useProducts";

interface Props {
  onStockCounts: (low: number, out: number) => void;
}

export default function ProductRail({ onStockCounts }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");

  const { products, loading, error, lowStockCount, outOfStockCount } =
    useProducts(search, category);

  // Bubble stock counts up to PosShell for BottomBar
  useState(() => {
    onStockCounts(lowStockCount, outOfStockCount);
  });

  return (
    <div className="panel" style={{ background: "var(--bg-base)" }}>
      <SearchBar value={search} onChange={setSearch} />
      <CategoryChips active={category} onChange={setCategory} />

      {error && (
        <div className="alert alert-error" style={{ margin: "8px 12px" }}>
          {error}
        </div>
      )}

      <div className="panel-body">
        <ProductGrid products={products} loading={loading} search={search} />
      </div>
    </div>
  );
}
