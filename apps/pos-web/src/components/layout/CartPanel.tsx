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

import { useState } from "react";
import OnlineOrderModal, { ONLINE_CHANNELS } from "../../features/checkout/OnlineOrderModal";
import { Smartphone } from "lucide-react";
import Button from "../ui/Button";
import GlassPanel from "../ui/GlassPanel";

export default function CartPanel() {
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const itemCount = useCartStore((s) => s.itemCount);
  const carts = useCartStore((s) => s.carts);
  const activeCartId = useCartStore((s) => s.activeCartId);
  const orderType = useCartStore((s) => s.orderType);
  const channel = useCartStore((s) => s.channel);
  const externalOrderId = useCartStore((s) => s.externalOrderId);
  const courierName = useCartStore((s) => s.courierName);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const createCart = useCartStore((s) => s.createCart);
  const switchCart = useCartStore((s) => s.switchCart);
  const holdActiveCart = useCartStore((s) => s.holdActiveCart);
  const removeCart = useCartStore((s) => s.removeCart);
  const activeCart = carts.find((cart) => cart.id === activeCartId);
  const heldCount = carts.filter((cart) => cart.isHeld).length;

  const activeChanObj = ONLINE_CHANNELS.find((c) => c.id === channel);

  const { hasModule, businessPreset } = useStoreCapabilities();
  // Show selector for F&B-style verticals or when KDS module is active.
  const showOrderTypeSelector =
    hasModule("fnb.kds") ||
    hasModule("fnb.tables") ||
    businessPreset === "restaurant" ||
    businessPreset === "cafe";

  return (
    <>
      <GlassPanel className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="panel-header" style={{ background: 'transparent' }}>
          <ShoppingCart size={14} />
          <span style={{ fontWeight: 600 }}>{activeCart?.label ?? "Keranjang"}</span>
          {itemCount > 0 && (
            <span
              style={{
                marginLeft: "auto",
                background: "var(--primary-500)",
                color: "#fff",
                borderRadius: "var(--radius-pill)",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {itemCount}
            </span>
          )}
        </div>

        {/* Active Online Order Channel Badge Banner */}
        {channel && (
          <div
            onClick={() => setShowOnlineModal(true)}
            style={{
              padding: "8px 12px",
              background: activeChanObj?.bg || "var(--primary-50)",
              borderBottom: `1px solid ${activeChanObj?.border || "var(--primary-200)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            className="hover-scale"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>{activeChanObj?.icon || "📱"}</span>
              <span style={{ fontWeight: 700, color: activeChanObj?.color || "var(--primary-800)" }}>
                Order Online — {activeChanObj?.name || channel}
              </span>
              {externalOrderId && (
                <span
                  style={{
                    background: "#ffffff",
                    padding: "2px 6px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 10,
                    fontWeight: 700,
                    border: "1px solid var(--border)",
                  }}
                >
                  #{externalOrderId}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "underline" }}>
              Ubah
            </span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "10px 12px",
            borderBottom: "1px solid var(--border)",
            overflowX: "auto",
          }}
        >
          {carts.map((cart) => (
            <Button
              key={cart.id}
              onClick={() => switchCart(cart.id)}
              variant={cart.id === activeCartId ? "primary" : "ghost"}
              size="sm"
              style={{ flexShrink: 0 }}
              title={cart.isHeld ? "Order tertahan" : "Keranjang aktif"}
            >
              {cart.isHeld ? "Hold" : "Cart"} {cart.items.length}
              {carts.length > 1 && (
                <span
                  onClick={(event) => {
                    event.stopPropagation();
                    removeCart(cart.id);
                  }}
                  style={{ display: "inline-flex", marginLeft: 4, opacity: 0.7 }}
                  className="hover-scale"
                >
                  <X size={12} />
                </span>
              )}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => createCart()}
            title="Keranjang baru"
            style={{ flexShrink: 0, padding: "0 8px" }}
          >
            <Plus size={14} />
          </Button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "10px 12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={itemCount === 0}
            onClick={() => {
              const label = prompt("Nama hold order", activeCart?.label ?? "");
              holdActiveCart(label ?? undefined);
            }}
            style={{ flex: 1 }}
            leftIcon={<Pause size={14} />}
          >
            Hold
          </Button>
          <Button
            size="sm"
            onClick={() => setShowOnlineModal(true)}
            style={{
              background: channel ? (activeChanObj?.color || "#ee4d2d") : "var(--bg-elevated)",
              color: channel ? "#fff" : "var(--text-primary)",
              border: `1px solid ${channel ? activeChanObj?.color : "var(--border)"}`,
            }}
            title="Input manual order dari Tablet GoFood / GrabFood / ShopeeFood"
            leftIcon={<Smartphone size={14} />}
          >
            Online
          </Button>
          {heldCount > 0 && (
            <span
              style={{
                alignSelf: "center",
                whiteSpace: "nowrap",
                background: "var(--warning)",
                color: "#fff",
                padding: "4px 8px",
                borderRadius: "var(--radius-pill)",
                fontSize: 11,
                fontWeight: 700
              }}
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
            gap: 8,
            padding: "10px 12px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          {ORDER_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = orderType === opt.value;
            return (
              <Button
                key={opt.value}
                role="radio"
                aria-checked={active}
                onClick={() => setOrderType(opt.value)}
                title={opt.label}
                variant={active ? "primary" : "secondary"}
                size="sm"
                style={{ padding: "0" }}
              >
                <Icon size={14} style={{ marginRight: 4 }} />
                {opt.label}
              </Button>
            );
          })}
        </div>
      )}
      <div className="panel-body" style={{ flex: 1, overflowY: 'auto' }}>
        <CartList />
      </div>
      <div className="panel-footer" style={{ marginTop: 'auto', background: 'transparent' }}>
        <CartSummary />
      </div>
    </GlassPanel>

    {showOnlineModal && (
      <OnlineOrderModal onClose={() => setShowOnlineModal(false)} />
    )}
    </>
  );
}
