// apps/pos-web/src/components/layout/CartPanel.tsx
// Phase 12: Enterprise UI polish — header shows item count

import { Pause, Plus, ShoppingCart, X } from "lucide-react";
import CartList from "../../features/cart/CartList";
import CartSummary from "../../features/cart/CartSummary";
import { useCartStore } from "../../store/cart.store";

export default function CartPanel() {
  const itemCount = useCartStore((s) => s.itemCount);
  const carts = useCartStore((s) => s.carts);
  const activeCartId = useCartStore((s) => s.activeCartId);
  const createCart = useCartStore((s) => s.createCart);
  const switchCart = useCartStore((s) => s.switchCart);
  const holdActiveCart = useCartStore((s) => s.holdActiveCart);
  const removeCart = useCartStore((s) => s.removeCart);
  const activeCart = carts.find((cart) => cart.id === activeCartId);
  const heldCount = carts.filter((cart) => cart.isHeld).length;

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
      <div className="panel-body">
        <CartList />
      </div>
      <div className="panel-footer">
        <CartSummary />
      </div>
    </div>
  );
}
