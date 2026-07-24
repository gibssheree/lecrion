import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CheckoutService } from '../checkout/checkout.service';
import { CartService } from '../chatbot/cart.service';
import { ReadModelService } from '../reports/read-model.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { CreatePosSaleDto } from './pos-sales.dto';
import { PosSalesService } from './pos-sales.service';
import { PosCorrectionsService } from './pos-corrections.service';
import { PosApprovalService } from './pos-approval.service';
import { PosSessionService } from './pos-session.service';
import {
  VoidOrderDto,
  RefundOrderDto,
  ReturnItemsDto,
} from './pos-corrections.dto';
import {
  RequestApprovalDto,
  ResolveApprovalDto,
  RejectApprovalDto,
  InlineApprovalDto,
} from './pos-approval.dto';
import { OpenSessionDto, CloseSessionDto } from './pos-session.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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
 * Phase 9: Added @Roles guards.
 *   - createSale, checkout: cashier and above
 *   - void, refund, return: manager and above (cashier needs manager approval)
 *   - approval endpoints: any authenticated user (approval itself is PIN-gated)
 */
@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PosController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly cartService: CartService,
    private readonly readModelService: ReadModelService,
    private readonly posSalesService: PosSalesService,
    private readonly posCorrectionsService: PosCorrectionsService,
    private readonly posApprovalService: PosApprovalService,
    private readonly posSessionService: PosSessionService,
  ) {}

  // ── Kasir Sessions ────────────────────────────────────────────────────────

  /**
   * GET /api/pos/sessions/current
   * Returns the caller's currently open session, or null.
   */
  @Get('sessions/current')
  @Roles('owner', 'manager', 'cashier')
  getCurrentSession(@CurrentUser() user: AuthUser) {
    return this.posSessionService.getCurrentSession(user);
  }

  /**
   * GET /api/pos/sessions
   * List sessions for the store (manager/owner only).
   */
  @Get('sessions')
  @Roles('owner', 'manager')
  listSessions(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posSessionService.listSessions(user, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * POST /api/pos/sessions/open
   * Opens a new kasir session for the current cashier.
   */
  @Post('sessions/open')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager', 'cashier')
  openSession(@Body() dto: OpenSessionDto, @CurrentUser() user: AuthUser) {
    return this.posSessionService.openSession(dto, user);
  }

  /**
   * POST /api/pos/sessions/:id/close
   * Closes an open kasir session.
   */
  @Post('sessions/:id/close')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager', 'cashier')
  closeSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseSessionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.posSessionService.closeSession(id, dto, user);
  }

  @Post('sales')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager', 'cashier')
  async createSale(
    @Body() dto: CreatePosSaleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.posSalesService.createSale(dto, user);
  }

  @Get('sales/:orderId/receipt')
  @Roles('owner', 'manager', 'cashier')
  async getSaleReceipt(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.posSalesService.getReceiptByOrderId(orderId);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager', 'cashier')
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

  // ── Phase 5: Correction endpoints ─────────────────────────────────────────

  /**
   * GET /api/pos/corrections
   * List void / refund / return correction documents.
   */
  @Get('corrections')
  @Roles('owner', 'manager', 'cashier')
  listCorrections(
    @Query('type') type?: string,
    @Query('storeId') storeId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.posCorrectionsService.listCorrections({
      type,
      storeId,
      fromDate,
      toDate,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Post('orders/:id/void')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager', 'cashier')
  voidOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VoidOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.posCorrectionsService.voidOrder(id, dto, user);
  }

  @Post('orders/:id/refund')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager', 'cashier')
  refundOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefundOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.posCorrectionsService.refundOrder(id, dto, user);
  }

  @Post('orders/:id/return-items')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager', 'cashier')
  returnItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReturnItemsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.posCorrectionsService.returnItems(id, dto, user);
  }

  // ── Phase 5D: Manager Approval endpoints ──────────────────────────────────

  @Get('approval/thresholds')
  @Roles('owner', 'manager', 'cashier')
  getApprovalThresholds() {
    return this.posApprovalService.getThresholds();
  }

  @Post('approval/request')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager', 'cashier')
  requestApproval(@Body() dto: RequestApprovalDto) {
    return this.posApprovalService.requestApproval(dto);
  }

  @Post('approval/:id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager')
  approveRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveApprovalDto,
  ) {
    return this.posApprovalService.approveRequest(id, dto);
  }

  @Post('approval/:id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager')
  rejectRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectApprovalDto,
  ) {
    return this.posApprovalService.rejectRequest(id, dto);
  }

  @Post('approval/inline')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager', 'cashier')
  inlineApprove(@Body() dto: InlineApprovalDto) {
    return this.posApprovalService.inlineApprove(dto);
  }

  @Get('approval/:id')
  @Roles('owner', 'manager', 'cashier')
  getApproval(@Param('id', ParseIntPipe) id: number) {
    return this.posApprovalService.getApproval(id);
  }
}
