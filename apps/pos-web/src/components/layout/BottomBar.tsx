// apps/pos-web/src/components/layout/BottomBar.tsx
// Phase 12: Enterprise UI polish — compact status bar with keyboard shortcuts

import {
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Keyboard,
} from "lucide-react";
import { useOnlineContext } from "../../app/OnlineStatusProvider";

interface Props {
  lowStockCount: number;
  outOfStockCount: number;
}

export default function BottomBar({ lowStockCount, outOfStockCount }: Props) {
  const { isOnline, isBrowserOffline, pendingCount, isSyncing, failedCount } =
    useOnlineContext();

  return (
    <div className="bottombar">
      {/* Stock alerts */}
      {outOfStockCount > 0 && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "var(--stock-out)",
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={11} /> {outOfStockCount} habis
        </span>
      )}
      {lowStockCount > 0 && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "var(--stock-low)",
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={11} /> {lowStockCount} menipis
        </span>
      )}
      {lowStockCount === 0 && outOfStockCount === 0 && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: "var(--stock-ok)",
          }}
        >
          <CheckCircle size={11} /> Stok aman
        </span>
      )}

      {/* Keyboard shortcuts hint */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: "var(--text-muted)",
          marginLeft: 8,
        }}
      >
        <Keyboard size={10} />
        F1 Cari · F2 Bayar · F4 Riwayat · Esc Batal
      </span>

      {/* Sync / online status */}
      <span
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {isBrowserOffline ? (
          <>
            <WifiOff size={11} color="var(--stock-out)" />
            <span style={{ color: "var(--stock-out)", fontWeight: 600 }}>
              Offline
            </span>
          </>
        ) : !isOnline ? (
          <>
            <WifiOff size={11} color="var(--stock-low)" />
            <span style={{ color: "var(--stock-low)" }}>Koneksi terbatas</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <RefreshCw
              size={11}
              color="var(--stock-low)"
              style={{
                animation: isSyncing ? "spin 1s linear infinite" : "none",
              }}
            />
            <span style={{ color: "var(--stock-low)" }}>
              {isSyncing ? "Menyinkronkan…" : `${pendingCount} pending`}
            </span>
          </>
        ) : failedCount > 0 ? (
          <>
            <AlertTriangle size={11} color="var(--stock-out)" />
            <span style={{ color: "var(--stock-out)" }}>
              {failedCount} gagal
            </span>
          </>
        ) : (
          <>
            <Wifi size={11} color="var(--stock-ok)" />
            <span style={{ color: "var(--stock-ok)" }}>Synced</span>
          </>
        )}
      </span>
    </div>
  );
}
