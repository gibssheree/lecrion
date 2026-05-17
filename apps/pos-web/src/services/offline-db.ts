// apps/pos-web/src/services/offline-db.ts
//
// Phase 8 — Offline Mode: IndexedDB wrapper using `idb`.
//
// Stores:
//   products     — cached product catalog (key: id)
//   categories   — cached categories (key: id)
//   pending_sales — queued sales waiting to sync (key: clientSaleId)
//   receipts     — cached receipts for offline viewing (key: orderId)
//   session      — active register session snapshot (key: "active")
//
// Design rules:
//   • All writes are fire-and-forget — never block the UI.
//   • Reads return null/[] on any error — offline fallback is best-effort.
//   • DB version bumps add stores; never remove existing stores.

import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "lecrion-pos";
const DB_VERSION = 1;

export interface CachedProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  category?: string;
  categoryId?: number | null;
  categoryName?: string | null;
  isStockTracked?: boolean;
  unitName?: string | null;
  productType?: string;
  sku?: string | null;
  barcode?: string | null;
  cachedAt: number; // Date.now()
}

export interface PendingSale {
  clientSaleId: string;
  payload: any; // CreatePosSaleRequest
  queuedAt: number;
  attempts: number;
  lastError?: string;
  status: "pending" | "syncing" | "failed";
}

export interface CachedReceipt {
  orderId: number;
  receipt: any; // PosSaleReceipt
  cachedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("products")) {
          const ps = db.createObjectStore("products", { keyPath: "id" });
          ps.createIndex("by_name", "name");
          ps.createIndex("by_barcode", "barcode");
          ps.createIndex("by_sku", "sku");
        }
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("pending_sales")) {
          const pss = db.createObjectStore("pending_sales", {
            keyPath: "clientSaleId",
          });
          pss.createIndex("by_status", "status");
          pss.createIndex("by_queued_at", "queuedAt");
        }
        if (!db.objectStoreNames.contains("receipts")) {
          db.createObjectStore("receipts", { keyPath: "orderId" });
        }
        if (!db.objectStoreNames.contains("session")) {
          db.createObjectStore("session");
        }
      },
    });
  }
  return dbPromise;
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function cacheProducts(products: CachedProduct[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction("products", "readwrite");
    const now = Date.now();
    await Promise.all([
      ...products.map((p) => tx.store.put({ ...p, cachedAt: now })),
      tx.done,
    ]);
  } catch {
    /* non-critical */
  }
}

export async function getCachedProducts(): Promise<CachedProduct[]> {
  try {
    const db = await getDb();
    return await db.getAll("products");
  } catch {
    return [];
  }
}

export async function getCachedProductByBarcode(
  barcode: string,
): Promise<CachedProduct | null> {
  try {
    const db = await getDb();
    const idx = db.transaction("products").store.index("by_barcode");
    return (await idx.get(barcode)) ?? null;
  } catch {
    return null;
  }
}

export async function getCachedProductBySku(
  sku: string,
): Promise<CachedProduct | null> {
  try {
    const db = await getDb();
    const idx = db.transaction("products").store.index("by_sku");
    return (await idx.get(sku)) ?? null;
  } catch {
    return null;
  }
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function cacheCategories(categories: any[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction("categories", "readwrite");
    await Promise.all([...categories.map((c) => tx.store.put(c)), tx.done]);
  } catch {
    /* non-critical */
  }
}

export async function getCachedCategories(): Promise<any[]> {
  try {
    const db = await getDb();
    return await db.getAll("categories");
  } catch {
    return [];
  }
}

// ── Pending sales queue ───────────────────────────────────────────────────────

export async function enqueueSale(
  sale: Omit<PendingSale, "attempts" | "status">,
): Promise<void> {
  try {
    const db = await getDb();
    await db.put("pending_sales", { ...sale, attempts: 0, status: "pending" });
  } catch {
    /* non-critical */
  }
}

export async function getPendingSales(): Promise<PendingSale[]> {
  try {
    const db = await getDb();
    const all = await db.getAll("pending_sales");
    return all.filter((s) => s.status !== "failed" || s.attempts < 3);
  } catch {
    return [];
  }
}

export async function updatePendingSale(
  clientSaleId: string,
  update: Partial<PendingSale>,
): Promise<void> {
  try {
    const db = await getDb();
    const existing = await db.get("pending_sales", clientSaleId);
    if (existing) {
      await db.put("pending_sales", { ...existing, ...update });
    }
  } catch {
    /* non-critical */
  }
}

export async function removePendingSale(clientSaleId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete("pending_sales", clientSaleId);
  } catch {
    /* non-critical */
  }
}

export async function getPendingSaleCount(): Promise<number> {
  try {
    const db = await getDb();
    const all = await db.getAll("pending_sales");
    return all.filter((s) => s.status === "pending").length;
  } catch {
    return 0;
  }
}

// ── Receipts ──────────────────────────────────────────────────────────────────

export async function cacheReceipt(receipt: any): Promise<void> {
  try {
    const db = await getDb();
    await db.put("receipts", {
      orderId: receipt.orderId,
      receipt,
      cachedAt: Date.now(),
    });
  } catch {
    /* non-critical */
  }
}

export async function getCachedReceipt(orderId: number): Promise<any | null> {
  try {
    const db = await getDb();
    const row = await db.get("receipts", orderId);
    return row?.receipt ?? null;
  } catch {
    return null;
  }
}

// ── Session ───────────────────────────────────────────────────────────────────

export async function cacheSession(session: any): Promise<void> {
  try {
    const db = await getDb();
    await db.put("session", session, "active");
  } catch {
    /* non-critical */
  }
}

export async function getCachedSession(): Promise<any | null> {
  try {
    const db = await getDb();
    return (await db.get("session", "active")) ?? null;
  } catch {
    return null;
  }
}

// ── Cache freshness ───────────────────────────────────────────────────────────

/** Returns true if the product cache is older than maxAgeMs (default 1 hour) */
export async function isProductCacheStale(
  maxAgeMs = 3_600_000,
): Promise<boolean> {
  try {
    const db = await getDb();
    const all = await db.getAll("products");
    if (!all.length) return true;
    const oldest = Math.min(...all.map((p) => p.cachedAt ?? 0));
    return Date.now() - oldest > maxAgeMs;
  } catch {
    return true;
  }
}
