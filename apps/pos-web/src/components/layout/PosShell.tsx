import { useState, useEffect } from "react";
import TopBar from "./TopBar";
import BottomBar from "./BottomBar";
import ProductRail from "./ProductRail";
import CartPanel from "./CartPanel";
import PaymentDrawer from "./PaymentDrawer";
import RecentOrdersDrawer from "../../features/orders/RecentOrdersDrawer";
import OfflineSyncBanner from "./OfflineSyncBanner";
import { useCartStore } from "../../store/cart.store";

export default function PosShell() {
  const [showOrders, setShowOrders] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutCount] = useState(0);
  const clear = useCartStore((s) => s.clear);

  // Esc = clear cart (when no modal open)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !showOrders) clear();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showOrders, clear]);

  function handleStockCounts(low: number, out: number) {
    setLowStockCount(low);
    setOutCount(out);
  }

  return (
    <div className="pos-shell">
      <TopBar onOpenOrders={() => setShowOrders(true)} />
      <OfflineSyncBanner />

      <div className="pos-main">
        <ProductRail onStockCounts={handleStockCounts} />
        <CartPanel />
        <PaymentDrawer onOpenOrders={() => setShowOrders(true)} />
      </div>

      <BottomBar
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
      />

      {showOrders && (
        <RecentOrdersDrawer onClose={() => setShowOrders(false)} />
      )}
    </div>
  );
}
