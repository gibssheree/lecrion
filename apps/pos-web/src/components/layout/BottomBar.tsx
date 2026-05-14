import { AlertTriangle, CheckCircle, Wifi } from "lucide-react";

interface Props {
  lowStockCount: number;
  outOfStockCount: number;
}

export default function BottomBar({ lowStockCount, outOfStockCount }: Props) {
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
          <AlertTriangle size={12} /> {outOfStockCount} produk habis
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
          <AlertTriangle size={12} /> {lowStockCount} produk menipis
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
          <CheckCircle size={12} /> Semua stok aman
        </span>
      )}

      <span
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Wifi size={12} color="var(--stock-ok)" /> Synced
      </span>

      {/* Keyboard shortcuts hint */}
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
        F1 = Cari · F2 = Bayar · Esc = Kosongkan
      </span>
    </div>
  );
}
