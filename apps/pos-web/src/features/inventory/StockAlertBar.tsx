// apps/pos-web/src/features/inventory/StockAlertBar.tsx
// Bottom bar stock warning — shows count of low/out-of-stock items

import { AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
  lowStockCount: number;
  outOfStockCount: number;
}

export default function StockAlertBar({
  lowStockCount,
  outOfStockCount,
}: Props) {
  if (outOfStockCount > 0) {
    return (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: "var(--stock-out)",
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        <AlertTriangle size={12} />
        {outOfStockCount} produk habis
        {lowStockCount > 0 ? `, ${lowStockCount} menipis` : ""}
      </span>
    );
  }

  if (lowStockCount > 0) {
    return (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: "var(--stock-low)",
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        <AlertTriangle size={12} />
        {lowStockCount} produk stok menipis
      </span>
    );
  }

  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        color: "var(--stock-ok)",
        fontSize: 12,
      }}
    >
      <CheckCircle size={12} />
      Semua stok aman
    </span>
  );
}
