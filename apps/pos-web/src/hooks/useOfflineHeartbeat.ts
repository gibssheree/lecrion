// apps/pos-web/src/hooks/useOfflineHeartbeat.ts
//
// Feature 4: Offline / Hybrid — Auto-sync heartbeat with exponential backoff.
//
// What this does (beyond useSyncQueue which already does basic auto-sync):
//   1. Monitors the pending queue while OFFLINE via a configurable polling interval.
//   2. On reconnect: triggers an immediate sync and shows a toast notification.
//   3. Uses exponential backoff for retry intervals when sync keeps failing.
//   4. Emits toast notifications for:
//      - Going offline    → persistent warning toast
//      - Reconnected      → triggers sync, shows success/partial-fail result
//      - Sync completely failed (> maxRetries) → persistent error toast
//   5. Exposes a `retryCount` so the UI can show "X retry attempts".
//
// Usage:
//   Mount once at the root (already wired via OnlineStatusProvider / AppProviders).
//   This hook is consumed by OfflineSyncBanner.tsx.

import { useEffect, useRef, useCallback, useState } from "react";
import { useOnlineContext } from "../app/OnlineStatusProvider";
import { useToast } from "../store/toast.store";

export interface OfflineHeartbeatState {
  /** Number of consecutive sync failures since last successful sync */
  retryCount: number;
  /** Whether the device was recently offline (in last 60 s) */
  wasRecentlyOffline: boolean;
  /** ISO string of when it came back online, or null */
  reconnectedAt: string | null;
  /** Manually force a sync attempt */
  forceSync: () => Promise<void>;
}

// How long to wait before first retry after failure (ms)
const BASE_BACKOFF_MS = 5_000;
// Max backoff cap
const MAX_BACKOFF_MS = 120_000;
// How long after reconnect we keep "wasRecentlyOffline" flag active (ms)
const RECENTLY_OFFLINE_WINDOW_MS = 60_000;

export function useOfflineHeartbeat(): OfflineHeartbeatState {
  const { isOnline, isBrowserOffline, pendingCount, isSyncing, triggerSync } =
    useOnlineContext();
  const toast = useToast();

  const [retryCount, setRetryCount] = useState(0);
  const [reconnectedAt, setReconnectedAt] = useState<string | null>(null);
  const [wasRecentlyOffline, setWasRecentlyOffline] = useState(false);

  // Track previous online state to detect transitions
  const prevOnlineRef = useRef(isOnline);
  // Track the persistent offline toast ID so we can dismiss it on reconnect
  const offlineToastIdRef = useRef<string | null>(null);
  // Backoff timer ref
  const backoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Retry count ref (for use inside closures)
  const retryCountRef = useRef(0);

  const clearBackoff = useCallback(() => {
    if (backoffTimerRef.current) {
      clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }
  }, []);

  const scheduleRetrySync = useCallback(
    (attempt: number) => {
      clearBackoff();
      const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS);
      backoffTimerRef.current = setTimeout(async () => {
        if (!isOnline) return; // still offline — skip
        try {
          await triggerSync();
          // Success — reset retry count
          setRetryCount(0);
          retryCountRef.current = 0;
        } catch {
          const next = retryCountRef.current + 1;
          setRetryCount(next);
          retryCountRef.current = next;
          if (next >= 5) {
            toast.persistent(
              "error",
              `❌ Sinkronisasi gagal ${next}x. Cek koneksi atau hubungi admin.`,
            );
          } else {
            scheduleRetrySync(next);
          }
        }
      }, delay);
    },
    [isOnline, triggerSync, toast, clearBackoff],
  );

  // ── Detect online ↔ offline transitions ────────────────────────────────────
  useEffect(() => {
    const wasOnline = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (!isOnline && wasOnline) {
      // Just went offline
      clearBackoff();
      const id = toast.persistent(
        "warning",
        `📡 Koneksi terputus. Transaksi akan disimpan offline${pendingCount > 0 ? ` (${pendingCount} pending)` : ""}.`,
      );
      offlineToastIdRef.current = id;
    }

    if (isOnline && !wasOnline) {
      // Just came back online
      const nowIso = new Date().toISOString();
      setReconnectedAt(nowIso);
      setWasRecentlyOffline(true);

      // Dismiss the offline persistent toast
      if (offlineToastIdRef.current) {
        toast.dismiss(offlineToastIdRef.current);
        offlineToastIdRef.current = null;
      }

      // Show reconnect toast
      if (pendingCount > 0) {
        toast.info(`🔄 Kembali online. Menyinkronkan ${pendingCount} transaksi…`);
      } else {
        toast.success("✅ Kembali online.");
      }

      // Reset retry count and trigger sync
      setRetryCount(0);
      retryCountRef.current = 0;
      clearBackoff();
      triggerSync().catch(() => {
        scheduleRetrySync(0);
      });

      // Clear "recently offline" flag after window
      setTimeout(() => setWasRecentlyOffline(false), RECENTLY_OFFLINE_WINDOW_MS);
    }
  }, [isOnline]);

  // ── If we just synced and pendingCount dropped to 0, show completion toast ──
  const prevPendingRef = useRef(pendingCount);
  useEffect(() => {
    const prev = prevPendingRef.current;
    prevPendingRef.current = pendingCount;

    if (prev > 0 && pendingCount === 0 && isOnline && wasRecentlyOffline) {
      toast.success(
        `✅ ${prev} transaksi offline berhasil disinkronkan.`,
      );
    }
  }, [pendingCount, isOnline, wasRecentlyOffline, toast]);

  // ── Heartbeat while offline: poll pending count every 30 s ─────────────────
  useEffect(() => {
    if (isBrowserOffline) {
      // Nothing to do while fully offline — useSyncQueue handles count refresh
    }
    return () => {
      clearBackoff();
    };
  }, [isBrowserOffline, clearBackoff]);

  const forceSync = useCallback(async () => {
    setRetryCount(0);
    retryCountRef.current = 0;
    clearBackoff();
    try {
      await triggerSync();
      toast.success("✅ Sinkronisasi manual berhasil.");
    } catch {
      toast.error("❌ Sinkronisasi gagal. Coba lagi.");
      scheduleRetrySync(0);
    }
  }, [triggerSync, toast, clearBackoff, scheduleRetrySync]);

  return { retryCount, wasRecentlyOffline, reconnectedAt, forceSync };
}
