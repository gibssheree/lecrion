// apps/pos-web/src/hooks/useSyncQueue.ts
//
// Phase 8 — Offline Mode: sync pending sales when back online.
//
// Behavior:
//   • When isOnline transitions from false → true, attempt to sync all pending sales.
//   • Each sale is retried up to 3 times before being marked "failed".
//   • Duplicate clientSaleId returns the same receipt (idempotent backend).
//   • Sync is non-blocking — UI continues normally during sync.
//   • pendingCount is exposed for TopBar/BottomBar indicator.

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getPendingSales,
  updatePendingSale,
  removePendingSale,
  getPendingSaleCount,
  cacheReceipt,
} from "../services/offline-db";
import { createPosSale } from "../services/api";

export interface SyncQueueState {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: number | null;
  failedCount: number;
  triggerSync: () => Promise<void>;
}

export function useSyncQueue(isOnline: boolean): SyncQueueState {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const syncingRef = useRef(false);
  const wasOfflineRef = useRef(!isOnline);

  const refreshCount = useCallback(async () => {
    const count = await getPendingSaleCount();
    setPendingCount(count);
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncingRef.current || !isOnline) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const pending = await getPendingSales();
      if (!pending.length) return;

      let failed = 0;
      for (const sale of pending) {
        if (sale.status === "failed" && sale.attempts >= 3) {
          failed++;
          continue;
        }

        await updatePendingSale(sale.clientSaleId, { status: "syncing" });

        try {
          const receipt = await createPosSale(sale.payload);
          // Success — remove from queue and cache receipt
          await removePendingSale(sale.clientSaleId);
          await cacheReceipt(receipt);
        } catch (err: any) {
          const attempts = (sale.attempts ?? 0) + 1;
          const newStatus = attempts >= 3 ? "failed" : "pending";
          await updatePendingSale(sale.clientSaleId, {
            status: newStatus,
            attempts,
            lastError: err.message,
          });
          if (newStatus === "failed") failed++;
        }
      }

      setFailedCount(failed);
      setLastSyncAt(Date.now());
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      await refreshCount();
    }
  }, [isOnline, refreshCount]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOfflineRef.current && isOnline) {
      triggerSync();
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, triggerSync]);

  // Refresh count on mount and periodically
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 10_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  return { pendingCount, isSyncing, lastSyncAt, failedCount, triggerSync };
}
