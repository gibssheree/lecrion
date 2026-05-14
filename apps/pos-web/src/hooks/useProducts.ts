import { useState, useEffect, useCallback } from "react";
import { getProducts } from "../services/api";

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category?: string;
  available?: boolean;
}

// Infer category from product name (mirrors CatalogService.inferCategory)
function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (
    n.includes("minum") ||
    n.includes("juice") ||
    n.includes("es ") ||
    n.includes("milo") ||
    n.includes("pop ice") ||
    n.includes("nutrisari") ||
    n.includes("saraba")
  )
    return "Minuman";
  if (
    n.includes("snack") ||
    n.includes("pisang") ||
    n.includes("roti") ||
    n.includes("kentang") ||
    n.includes("pie") ||
    n.includes("ubi")
  )
    return "Snack";
  return "Makanan";
}

export function useProducts(search: string, category: string) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts();
      const products = (res.products ?? []).map((p: any) => ({
        ...p,
        category: p.category ?? inferCategory(p.name),
      }));
      setAllProducts(products);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat produk");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filter by search + category
  const filtered = allProducts.filter((p) => {
    const matchSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Semua" || p.category === category;
    return matchSearch && matchCat;
  });

  const lowStockCount = allProducts.filter(
    (p) => p.stock > 0 && p.stock <= 5,
  ).length;
  const outOfStockCount = allProducts.filter((p) => p.stock <= 0).length;

  return {
    products: filtered,
    allProducts,
    loading,
    error,
    reload: load,
    lowStockCount,
    outOfStockCount,
  };
}
