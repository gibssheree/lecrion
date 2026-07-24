// apps/pos-web/src/components/layout/OfflineSyncBanner.tsx
//
// Feature 4: Offline / Hybrid — Persistent banner shown when device is offline
// or when there are unsynced transactions that failed permanently (>3 attempts).
//
// Shows:
//   • When offline: amber banner with pending count + manual sync button
//   • When permanently failed items exist: red banner with error detail
//   • Animates in/out with framer-motion
//
// Mount inside PosLayout/PosShell, directly below the TopBar.

import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, RefreshCw, AlertCircle, CheckCircle2, X } from "lucide-react";
import { useState } from "react";
import { useOnlineContext } from "../../app/OnlineStatusProvider";
import { useOfflineHeartbeat } from "../../hooks/useOfflineHeartbeat";

export default function OfflineSyncBanner() {
  const {
    isOnline,
    isBrowserOffline,
    pendingCount,
    failedCount,
    isSyncing,
  } = useOnlineContext();

  const { retryCount, wasRecentlyOffline, forceSync } = useOfflineHeartbeat();

  // Allow the user to dismiss the "recently synced" success banner
  const [successDismissed, setSuccessDismissed] = useState(false);
  const [prevPending] = useState(0);

  // Determine which banner to show (in priority order)
  const showOfflineBanner = !isOnline;
  const showFailedBanner = isOnline && failedCount > 0;
  const showRecentlyOnlineBanner =
    isOnline &&
    wasRecentlyOffline &&
    pendingCount === 0 &&
    failedCount === 0 &&
    !successDismissed;

  const showAny = showOfflineBanner || showFailedBanner || showRecentlyOnlineBanner;

  return (
    <AnimatePresence>
      {showAny && (
        <motion.div
          key="offline-banner-wrapper"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: "hidden" }}
        >
          {/* ── Offline banner ─────────────────────────────────────────── */}
          {showOfflineBanner && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 16px",
                background: isBrowserOffline
                  ? "var(--stock-out-bg, #fff1f1)"
                  : "var(--stock-low-bg, #fffbeb)",
                borderBottom: `1px solid ${isBrowserOffline ? "var(--stock-out-border, #fca5a5)" : "var(--stock-low-border, #fcd34d)"}`,
                fontSize: 12,
                fontWeight: 600,
                color: isBrowserOffline
                  ? "var(--stock-out, #dc2626)"
                  : "var(--stock-low, #d97706)",
              }}
            >
              <WifiOff size={14} />
              <span style={{ flex: 1 }}>
                {isBrowserOffline
                  ? "Tidak ada koneksi internet."
                  : "Server tidak terjangkau — mode offline aktif."}
                {pendingCount > 0 && (
                  <span style={{ marginLeft: 6, opacity: 0.8 }}>
                    {pendingCount} transaksi menunggu sinkronisasi.
                  </span>
                )}
                {retryCount > 0 && (
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>
                    (Percobaan ulang ke-{retryCount})
                  </span>
                )}
              </span>

              {pendingCount > 0 && isOnline && (
                <button
                  onClick={forceSync}
                  disabled={isSyncing}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid currentColor",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  <RefreshCw
                    size={11}
                    style={{
                      animation: isSyncing ? "spin 1s linear infinite" : "none",
                    }}
                  />
                  {isSyncing ? "Sync…" : "Sync Sekarang"}
                </button>
              )}
            </div>
          )}

          {/* ── Failed sync items banner ────────────────────────────────── */}
          {showFailedBanner && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 16px",
                background: "#fef2f2",
                borderBottom: "1px solid #fca5a5",
                fontSize: 12,
                fontWeight: 600,
                color: "#dc2626",
              }}
            >
              <AlertCircle size={14} />
              <span style={{ flex: 1 }}>
                {failedCount} transaksi offline gagal sinkronisasi setelah 3
                percobaan. Hubungi admin atau coba sinkronisasi manual.
              </span>
              <button
                onClick={forceSync}
                disabled={isSyncing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid currentColor",
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                <RefreshCw
                  size={11}
                  style={{
                    animation: isSyncing ? "spin 1s linear infinite" : "none",
                  }}
                />
                {isSyncing ? "Sync…" : "Coba Lagi"}
              </button>
            </div>
          )}

          {/* ── Recently synced success banner (auto-dismissed in 5 s) ─── */}
          {showRecentlyOnlineBanner && (
            <motion.div
              key="success-banner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 16px",
                background: "#f0fdf4",
                borderBottom: "1px solid #86efac",
                fontSize: 12,
                fontWeight: 600,
                color: "#166534",
              }}
            >
              <CheckCircle2 size={14} />
              <span style={{ flex: 1 }}>
                Kembali online. Semua transaksi tersinkron.
              </span>
              <button
                onClick={() => setSuccessDismissed(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  padding: 2,
                  opacity: 0.7,
                }}
                aria-label="Tutup"
              >
                <X size={13} />
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
