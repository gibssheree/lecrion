import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CheckoutService } from '../checkout/checkout.service';
import { CartService } from '../chatbot/cart.service';
import { ReadModelService } from '../reports/read-model.service';

interface PosCheckoutItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
}

interface PosCheckoutDto {
  items: PosCheckoutItem[];
  paymentMethod: string;
  cashierId: string;
  storeId?: string;
  customerName?: string;
  note?: string;
}

/**
 * PosController — thin checkout endpoint for apps/pos-web.
 *
 * Auth is handled globally by JwtAuthGuard in AppModule.
 * No need to re-declare it here — doing so causes DI issues
 * because PosModule doesn't import AuthModule.
 *
 * Route: POST /api/pos/checkout
 */
@Controller('pos')
export class PosController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly cartService: CartService,
    private readonly readModelService: ReadModelService,
  ) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  async checkout(@Body() dto: PosCheckoutDto) {
    const { items, paymentMethod, cashierId, customerName } = dto;

    if (!items?.length) {
      throw new Error('Tidak ada item dalam pesanan');
    }

    const sender = `pos:${cashierId}`;

    await this.cartService.saveCart(
      sender,
      items.map((item) => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        price: item.price,
      })),
    );

    const result = await this.checkoutService.createOrderFromCart({
      sender,
      customerName: customerName || `POS-${cashierId}`,
      orderType: 'pickup',
      correlationId: `pos-${Date.now()}`,
    });

    // Rebuild projections async — dashboard stays in sync after each sale
    this.readModelService.rebuildAll().catch(() => {
      /* non-critical */
    });

    return {
      orderId: result.orderId,
      total: result.total,
      items: result.items,
      paymentMethod,
    };
  }
}
