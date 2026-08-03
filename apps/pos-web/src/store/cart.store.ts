// apps/pos-web/src/store/cart.store.ts
//
// Cart state for the POS web app. The public fields `items`, `subtotal`, and
// `itemCount` remain available for checkout and existing UI, while Tier 2 adds
// held carts / multiple carts behind the same store.

import { create } from "zustand";

export type OrderType = "pickup" | "dine_in" | "delivery";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
  stock: number;
  isStockTracked: boolean;
}

export interface HeldCart {
  id: string;
  label: string;
  items: CartItem[];
  orderType: OrderType;
  channel?: string;
  externalOrderId?: string;
  courierName?: string;
  createdAt: string;
  updatedAt: string;
  isHeld: boolean;
}

interface CartState {
  carts: HeldCart[];
  activeCartId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  orderType: OrderType;
  channel?: string;
  externalOrderId?: string;
  courierName?: string;
  addItem: (product: {
    id: number;
    name: string;
    price: number;
    stock: number;
    isStockTracked?: boolean;
  }) => void;
  removeItem: (productId: number) => void;
  updateQty: (productId: number, qty: number) => void;
  clear: () => void;
  setOrderType: (type: OrderType) => void;
  setOnlineOrderDetails: (
    channel?: string,
    externalOrderId?: string,
    courierName?: string,
  ) => void;
  createCart: (label?: string) => void;
  switchCart: (cartId: string) => void;
  holdActiveCart: (label?: string) => void;
  removeCart: (cartId: string) => void;
  renameCart: (cartId: string, label: string) => void;
}

function newCart(label = "Keranjang Baru"): HeldCart {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    label,
    items: [],
    orderType: "dine_in",
    createdAt: now,
    updatedAt: now,
    isHeld: false,
  };
}

function calcTotals(items: CartItem[]) {
  return {
    subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
    itemCount: items.reduce((s, i) => s + i.qty, 0),
  };
}

function activeItems(carts: HeldCart[], activeCartId: string): CartItem[] {
  return carts.find((cart) => cart.id === activeCartId)?.items ?? [];
}

function activeOrderType(carts: HeldCart[], activeCartId: string): OrderType {
  return carts.find((cart) => cart.id === activeCartId)?.orderType ?? "dine_in";
}

function derive(carts: HeldCart[], activeCartId: string) {
  const items = activeItems(carts, activeCartId);
  const activeCart = carts.find((cart) => cart.id === activeCartId);
  return {
    carts,
    activeCartId,
    items,
    orderType: activeOrderType(carts, activeCartId),
    channel: activeCart?.channel,
    externalOrderId: activeCart?.externalOrderId,
    courierName: activeCart?.courierName,
    ...calcTotals(items),
  };
}

const initialCart = newCart("Keranjang 1");

export const useCartStore = create<CartState>((set, get) => ({
  carts: [initialCart],
  activeCartId: initialCart.id,
  items: [],
  subtotal: 0,
  itemCount: 0,
  orderType: initialCart.orderType,

  addItem: (product) => {
    const isStockTracked = product.isStockTracked ?? true;
    const { carts, activeCartId } = get();
    const updatedCarts = carts.map((cart) => {
      if (cart.id !== activeCartId) return cart;
      const existing = cart.items.find((i) => i.productId === product.id);
      let items: CartItem[];

      if (existing) {
        const nextQty = isStockTracked
          ? Math.min(existing.qty + 1, product.stock)
          : existing.qty + 1;
        items = cart.items.map((i) =>
          i.productId === product.id ? { ...i, qty: nextQty } : i,
        );
      } else {
        if (isStockTracked && product.stock <= 0) return cart;
        items = [
          ...cart.items,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            qty: 1,
            stock: product.stock,
            isStockTracked,
          },
        ];
      }
      return {
        ...cart,
        items,
        isHeld: false,
        updatedAt: new Date().toISOString(),
      };
    });
    set(derive(updatedCarts, activeCartId));
  },

  removeItem: (productId) => {
    const { carts, activeCartId } = get();
    const updatedCarts = carts.map((cart) =>
      cart.id === activeCartId
        ? {
            ...cart,
            items: cart.items.filter((i) => i.productId !== productId),
            updatedAt: new Date().toISOString(),
          }
        : cart,
    );
    set(derive(updatedCarts, activeCartId));
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    const { carts, activeCartId } = get();
    const updatedCarts = carts.map((cart) =>
      cart.id === activeCartId
        ? {
            ...cart,
            items: cart.items.map((i) => {
              if (i.productId !== productId) return i;
              const newQty = i.isStockTracked ? Math.min(qty, i.stock) : qty;
              return { ...i, qty: newQty };
            }),
            isHeld: false,
            updatedAt: new Date().toISOString(),
          }
        : cart,
    );
    set(derive(updatedCarts, activeCartId));
  },

  clear: () => {
    const { carts, activeCartId } = get();
    const updatedCarts = carts.map((cart) =>
      cart.id === activeCartId
        ? {
            ...cart,
            items: [],
            isHeld: false,
            updatedAt: new Date().toISOString(),
          }
        : cart,
    );
    set(derive(updatedCarts, activeCartId));
  },

  setOrderType: (type) => {
    const { carts, activeCartId } = get();
    const updatedCarts = carts.map((cart) =>
      cart.id === activeCartId
        ? { ...cart, orderType: type, updatedAt: new Date().toISOString() }
        : cart,
    );
    set(derive(updatedCarts, activeCartId));
  },

  setOnlineOrderDetails: (channel, externalOrderId, courierName) => {
    const { carts, activeCartId } = get();
    const updatedCarts = carts.map((cart) =>
      cart.id === activeCartId
        ? {
            ...cart,
            channel,
            externalOrderId,
            courierName,
            updatedAt: new Date().toISOString(),
          }
        : cart,
    );
    set(derive(updatedCarts, activeCartId));
  },

  createCart: (label) => {
    const cart = newCart(label ?? `Keranjang ${get().carts.length + 1}`);
    set(derive([...get().carts, cart], cart.id));
  },

  switchCart: (cartId) => {
    const { carts } = get();
    if (!carts.some((cart) => cart.id === cartId)) return;
    set(derive(carts, cartId));
  },

  holdActiveCart: (label) => {
    const { carts, activeCartId } = get();
    const activeCart = carts.find((cart) => cart.id === activeCartId);
    if (!activeCart || activeCart.items.length === 0) return;
    const nextLabel =
      label?.trim() ||
      activeCart.label ||
      `Hold ${new Date().toLocaleTimeString("id-ID")}`;
    const updatedCarts = carts.map((cart) =>
      cart.id === activeCartId
        ? {
            ...cart,
            label: nextLabel,
            isHeld: true,
            updatedAt: new Date().toISOString(),
          }
        : cart,
    );
    const freshCart = newCart(`Keranjang ${updatedCarts.length + 1}`);
    set(derive([...updatedCarts, freshCart], freshCart.id));
  },

  removeCart: (cartId) => {
    const { carts, activeCartId } = get();
    const remaining = carts.filter((cart) => cart.id !== cartId);
    const nextCarts = remaining.length ? remaining : [newCart("Keranjang 1")];
    const nextActive = activeCartId === cartId ? nextCarts[0].id : activeCartId;
    set(derive(nextCarts, nextActive));
  },

  renameCart: (cartId, label) => {
    const { carts, activeCartId } = get();
    const updatedCarts = carts.map((cart) =>
      cart.id === cartId
        ? {
            ...cart,
            label: label.trim() || cart.label,
            updatedAt: new Date().toISOString(),
          }
        : cart,
    );
    set(derive(updatedCarts, activeCartId));
  },
}));
