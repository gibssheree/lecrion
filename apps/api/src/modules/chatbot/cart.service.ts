import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

export interface CartItem {
  productId: number;
  name: string;
  qty: number;
  price: number;
}

export interface Cart {
  sender: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  updatedAt: string;
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(sender: string): Promise<Cart> {
    const row = await this.prisma.carts.findUnique({
      where: { sender },
    });

    if (!row) {
      return {
        sender,
        items: [],
        subtotal: 0,
        total: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    const payload = JSON.parse(row.payload);
    const totals = this.calculateTotals(payload.items);

    return {
      sender,
      items: payload.items,
      subtotal: totals.subtotal,
      total: totals.total,
      updatedAt: row.updated_at,
    };
  }

  private calculateTotals(items: CartItem[]) {
    const subtotal = items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0);
    return { subtotal, total: subtotal };
  }

  async saveCart(sender: string, items: CartItem[]) {
    const payload = JSON.stringify({ items });
    const now = new Date().toISOString();

    await this.prisma.carts.upsert({
      where: { sender },
      update: {
        payload,
        updated_at: now,
      },
      create: {
        sender,
        payload,
        updated_at: now,
      },
    });
  }

  async addItemToCart(sender: string, productId: number, qty = 1) {
    const quantity = Number(qty);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Jumlah item tidak valid');

    const product = await this.prisma.menu.findUnique({
      where: { id: productId },
    });
    if (!product) throw new Error('Produk tidak ditemukan');
    if (product.stock < quantity) throw new Error(`Stok ${product.name} tidak cukup. Tersisa ${product.stock}`);

    const cart = await this.getCart(sender);
    const existing = cart.items.find((item) => item.productId === product.id);

    if (existing) {
      const nextQty = existing.qty + quantity;
      if (nextQty > product.stock) throw new Error(`Stok ${product.name} tidak cukup. Tersisa ${product.stock}`);
      existing.qty = nextQty;
    } else {
      cart.items.push({
        productId: product.id,
        name: product.name,
        qty: quantity,
        price: Number(product.price),
      });
    }

    await this.saveCart(sender, cart.items);
    return this.getCart(sender);
  }

  async removeItemFromCart(sender: string, productRef: string | number) {
    const cart = await this.getCart(sender);
    const before = cart.items.length;

    cart.items = cart.items.filter((item) => {
      if (typeof productRef === 'number' && item.productId === productRef) return false;
      if (typeof productRef === 'string' && !isNaN(Number(productRef)) && item.productId === Number(productRef)) return false;
      return item.name.toLowerCase() !== String(productRef).toLowerCase();
    });

    if (cart.items.length < before) {
      await this.saveCart(sender, cart.items);
    }

    return { removed: cart.items.length < before, cart: await this.getCart(sender) };
  }

  async clearCart(sender: string) {
    await this.prisma.carts.delete({
      where: { sender },
    }).catch(() => {}); // ignore if doesn't exist
    return this.getCart(sender);
  }

  formatCartForMessage(cart: Cart): string {
    if (!cart.items.length) return 'Keranjang kamu masih kosong.';

    const lines = cart.items.map((item, index) => 
      `${index + 1}. ${item.name} x${item.qty} = Rp${new Intl.NumberFormat('id-ID').format(item.qty * item.price)}`
    );

    return [
      'Keranjang kamu:',
      ...lines,
      `Total: Rp${new Intl.NumberFormat('id-ID').format(cart.total)}`,
    ].join('\n');
  }
}
