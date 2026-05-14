import { create } from "zustand";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
  stock: number; // max allowed qty
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  addItem: (product: {
    id: number;
    name: string;
    price: number;
    stock: number;
  }) => void;
  removeItem: (productId: number) => void;
  updateQty: (productId: number, qty: number) => void;
  clear: () => void;
}

function calcTotals(items: CartItem[]) {
  return {
    subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
    itemCount: items.reduce((s, i) => s + i.qty, 0),
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,
  itemCount: 0,

  addItem: (product) => {
    const items = get().items;
    const existing = items.find((i) => i.productId === product.id);
    let updated: CartItem[];

    if (existing) {
      const nextQty = Math.min(existing.qty + 1, product.stock);
      updated = items.map((i) =>
        i.productId === product.id ? { ...i, qty: nextQty } : i,
      );
    } else {
      if (product.stock <= 0) return;
      updated = [
        ...items,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          qty: 1,
          stock: product.stock,
        },
      ];
    }

    set({ items: updated, ...calcTotals(updated) });
  },

  removeItem: (productId) => {
    const updated = get().items.filter((i) => i.productId !== productId);
    set({ items: updated, ...calcTotals(updated) });
  },

  updateQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }
    const updated = get().items.map((i) =>
      i.productId === productId ? { ...i, qty: Math.min(qty, i.stock) } : i,
    );
    set({ items: updated, ...calcTotals(updated) });
  },

  clear: () => set({ items: [], subtotal: 0, itemCount: 0 }),
}));
