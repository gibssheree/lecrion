import { ShoppingCart } from "lucide-react";
import CartList from "../../features/cart/CartList";
import CartSummary from "../../features/cart/CartSummary";

export default function CartPanel() {
  return (
    <div className="panel">
      <div className="panel-header">
        <ShoppingCart size={14} /> Keranjang
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
