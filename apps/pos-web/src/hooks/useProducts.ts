// apps/pos-web/src/hooks/useProducts.ts
//
// Phase 6A changes:
//   • Products now include categoryId and categoryName from the API.
//   • Category filtering uses categoryId when available (DB-backed),
//     falls back to inferred category string for legacy products.
//   • Barcode scanner: if search looks like a barcode (digits only, 8-14 chars),
//     call getProductByBarcode() for fast exact lookup.
//   • useCategories() hook exported for CategoryChips to consume.
//
// Phase 8 changes:
//   • When offline, fall back to IndexedDB cached products.
//   • After successful API fetch, update the IndexedDB cache.
//   • useCategories() also falls back to cached categories.

import { useState, useEffect, useCallback } from "react";
import {
  getProducts,
  getCategories,
  getProductByBarcode,
  ProductCategory,
} from "../services/api";
import {
  cacheProducts,
  getCachedProducts,
  cacheCategories,
  getCachedCategories,
  getCachedProductByBarcode,
} from "../services/offline-db";

export interface Product {
  id: number;
  name: string;
  price: number;
  costPrice?: number | null;
  stock: number;
  category?: string;
  categoryId?: number | null;
  categoryName?: string | null;
  available?: boolean;
  isActive?: boolean;
  isStockTracked?: boolean;
  unitName?: string | null;
  productType?: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
}

// ── Category hook ─────────────────────────────────────────────────────────────

export function useCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCategories()
      .then((res) => {
        if (!cancelled) {
          const cats = res.categories ?? [];
          setCategories(cats);
          // Phase 8: cache for offline use
          cacheCategories(cats).catch(() => {});
        }
      })
      .catch(async () => {
        // Phase 8: fall back to cached categories
        if (!cancelled) {
          const cached = await getCachedCategories();
          setCategories(cached as ProductCategory[]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading };
}

// ── Infer category from product name (legacy fallback) ────────────────────────
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

// ── Barcode detection ─────────────────────────────────────────────────────────
// A barcode scan typically produces a string of 8-14 digits very quickly.
// We detect this pattern to trigger a direct barcode lookup instead of
// the normal text search.
function looksLikeBarcode(s: string): boolean {
  return /^\d{8,14}$/.test(s.trim());
}

// ── Main products hook ────────────────────────────────────────────────────────

export function useProducts(search: string, category: string) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts();
      const products: Product[] = (res.products ?? []).map((p: any) => ({
        ...p,
        // Prefer DB-backed category name, fall back to inferred
        category: p.categoryName ?? p.category ?? inferCategory(p.name),
        categoryId: p.categoryId ?? null,
        categoryName: p.categoryName ?? null,
        isStockTracked: p.isStockTracked ?? true,
        isActive: p.isActive ?? true,
        unitName: p.unitName ?? null,
        productType: p.productType ?? "simple",
        sku: p.sku ?? null,
        barcode: p.barcode ?? null,
        brand: p.brand ?? null,
        costPrice: p.costPrice ?? null,
      }));
      setAllProducts(products);
      // Phase 8: update IndexedDB cache after successful fetch
      cacheProducts(products as any).catch(() => {});
    } catch (err: unknown) {
      // Phase 8: fall back to IndexedDB cache when offline
      const cached = await getCachedProducts();
      if (cached.length > 0) {
        setAllProducts(
          cached.map((p) => ({
            ...p,
            category: p.categoryName ?? p.category ?? inferCategory(p.name),
            costPrice: p.costPrice ?? null,
            isActive: p.isActive ?? true,
          })),
        );
        setError("Offline — menampilkan data tersimpan");
      } else {
        setError(err instanceof Error ? err.message : "Gagal memuat produk");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Barcode scanner fast path ──────────────────────────────────────────────
  // When search looks like a barcode, try to resolve it directly.
  // Returns a single-item array if found, empty array if not.
  const [barcodeResult, setBarcodeResult] = useState<Product | null>(null);
  const [barcodeLoading, setBarcodeLoading] = useState(false);

  useEffect(() => {
    if (!looksLikeBarcode(search)) {
      setBarcodeResult(null);
      return;
    }
    let cancelled = false;
    setBarcodeLoading(true);
    getProductByBarcode(search.trim())
      .then((res) => {
        if (cancelled) return;
        const p = res.product;
        if (p) {
          setBarcodeResult({
            ...p,
            category: p.categoryName ?? p.category ?? inferCategory(p.name),
            categoryId: p.categoryId ?? null,
            categoryName: p.categoryName ?? null,
            isStockTracked: p.isStockTracked ?? true,
            isActive: p.isActive ?? true,
            unitName: p.unitName ?? null,
            productType: p.productType ?? "simple",
            sku: p.sku ?? null,
            barcode: p.barcode ?? null,
            brand: p.brand ?? null,
            costPrice: p.costPrice ?? null,
          });
        } else {
          setBarcodeResult(null);
        }
      })
      .catch(async () => {
        // Phase 8: fall back to IndexedDB barcode lookup
        if (!cancelled) {
          const cached = await getCachedProductByBarcode(search.trim());
          setBarcodeResult(
            cached
              ? {
                  ...cached,
                  category:
                    cached.categoryName ??
                    cached.category ??
                    inferCategory(cached.name),
                }
              : null,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setBarcodeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  // ── Filter logic ───────────────────────────────────────────────────────────
  let filtered: Product[];

  if (looksLikeBarcode(search)) {
    // Barcode mode: show only the resolved product (or empty while loading)
    filtered = barcodeResult ? [barcodeResult] : [];
  } else {
    filtered = allProducts.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));

      // Category filter:
      // "Semua" = no filter
      // If category is a number string, filter by categoryId
      // Otherwise filter by category string (legacy inferred)
      let matchCat = true;
      if (category !== "Semua") {
        if (p.categoryName) {
          matchCat = p.categoryName === category;
        } else {
          matchCat = p.category === category;
        }
      }

      return matchSearch && matchCat;
    });
  }

  const lowStockCount = allProducts.filter(
    (p) => (p.isStockTracked ?? true) && p.stock > 0 && p.stock <= 5,
  ).length;
  const outOfStockCount = allProducts.filter(
    (p) => (p.isStockTracked ?? true) && p.stock <= 0,
  ).length;

  return {
    products: filtered,
    allProducts,
    loading: loading || barcodeLoading,
    error,
    reload: load,
    lowStockCount,
    outOfStockCount,
    isBarcodeMode: looksLikeBarcode(search),
  };
}
