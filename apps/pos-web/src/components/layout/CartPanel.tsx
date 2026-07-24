// apps/pos-web/src/components/layout/CartPanel.tsx
// Phase 12: Enterprise UI polish — header shows item count

import {
  Coffee,
  Package,
  Pause,
  Plus,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import CartList from "../../features/cart/CartList";
import CartSummary from "../../features/cart/CartSummary";
import { useCartStore, OrderType } from "../../store/cart.store";
import { useStoreCapabilities } from "../../hooks/useStoreCapabilities";

const ORDER_TYPE_OPTIONS: Array<{
  value: OrderType;
  label: string;
  icon: typeof Coffee;
}> = [
  { value: "dine_in", label: "Dine-in", icon: Coffee },
  { value: "pickup", label: "Take-away", icon: Package },
  { value: "delivery", label: "Delivery", icon: Truck },
];

export default function CartPanel() {
  const itemCount = useCartStore((s) => s.itemCount);
  const carts = useCartStore((s) => s.carts);
  const activeCartId = useCartStore((s) => s.activeCartId);
  const orderType = useCartStore((s) => s.orderType);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const createCart = useCartStore((s) => s.createCart);
  const switchCart = useCartStore((s) => s.switchCart);
  const holdActiveCart = useCartStore((s) => s.holdActiveCart);
  const removeCart = useCartStore((s) => s.removeCart);
  const activeCart = carts.find((cart) => cart.id === activeCartId);
  const heldCount = carts.filter((cart) => cart.isHeld).length;

  const { hasModule, businessPreset } = useStoreCapabilities();
  // Show selector for F&B-style verticals or when KDS module is active.
  const showOrderTypeSelector =
    hasModule("fnb.kds") ||
    hasModule("fnb.tables") ||
    businessPreset === "restaurant" ||
    businessPreset === "cafe";

  return (
    <div className="panel">
      <div className="panel-header">
        <ShoppingCart size={13} />
        {activeCart?.label ?? "Keranjang"}
        {itemCount > 0 && (
          <span
            style={{
              marginLeft: "auto",
              background: "var(--primary)",
              color: "#fff",
              borderRadius: "10px",
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 7px",
              minWidth: 20,
              textAlign: "center",
            }}
          >
            {itemCount}
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "8px 10px",
          borderBottom: "1px solid var(--border)",
          overflowX: "auto",
        }}
      >
        {carts.map((cart) => (
          <button
            key={cart.id}
            onClick={() => switchCart(cart.id)}
            className={`btn btn-sm ${cart.id === activeCartId ? "btn-primary" : "btn-ghost"}`}
            style={{ flexShrink: 0, padding: "4px 8px" }}
            title={cart.isHeld ? "Order tertahan" : "Keranjang aktif"}
          >
            {cart.isHeld ? "Hold" : "Cart"} {cart.items.length}
            {carts.length > 1 && (
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  removeCart(cart.id);
                }}
                style={{ display: "inline-flex", marginLeft: 2 }}
              >
                <X size={10} />
              </span>
            )}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => createCart()}
          title="Keranjang baru"
          style={{ flexShrink: 0, padding: "4px 8px" }}
        >
          <Plus size={11} />
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "8px 10px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          className="btn btn-ghost btn-sm"
          disabled={itemCount === 0}
          onClick={() => {
            const label = prompt("Nama hold order", activeCart?.label ?? "");
            holdActiveCart(label ?? undefined);
          }}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Pause size={12} /> Hold Order
        </button>
        {heldCount > 0 && (
          <span
            className="badge yellow"
            style={{ alignSelf: "center", whiteSpace: "nowrap" }}
          >
            {heldCount} hold
          </span>
        )}
      </div>

      {showOrderTypeSelector && (
        <div
          role="radiogroup"
          aria-label="Tipe pesanan"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 6,
            padding: "8px 10px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          {ORDER_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = orderType === opt.value;
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={active}
                onClick={() => setOrderType(opt.value)}
                title={opt.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: "7px 8px",
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                  background: active ? "var(--primary)" : "var(--bg-surface)",
                  color: active ? "#fff" : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                }}
              >
                <Icon size={13} />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="panel-body">
        <CartList />
      </div>
      <div className="panel-footer">
        <CartSummary />
      </div>
    </div>
  );
}
