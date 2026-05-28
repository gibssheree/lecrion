import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { UsersService } from '../users/users.service';
import { SyncService } from '../sync/sync.service';
import { ReadModelService } from '../reports/read-model.service';
import {
  CashflowEntryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PosSaleStatus,
  PosTaxMode,
  RegisterSessionStatus,
  StockMovementType,
} from '@libs/contracts/src/enums';
import {
  CASHFLOW_EVENTS,
  ORDER_EVENTS,
  PAYMENT_EVENTS,
  POS_SALE_EVENTS,
  STOCK_EVENTS,
} from '@libs/contracts/src/events';
import { AuthUser } from '../auth/auth.types';
import { CreatePosSaleDto, PosSaleReceipt } from './pos-sales.dto';
import { PosCalculationService } from './pos-calculation.service';
import { StoresService } from '../stores/stores.service';

type MenuRow = {
  id: number;
  name: string;
  price: number;
  stock: number;
  is_stock_tracked?: boolean | null;
};

@Injectable()
export class PosSalesService {
  private readonly logger = new Logger(PosSalesService.name);
  private readonly IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly sync: SyncService,
    private readonly readModel: ReadModelService,
    private readonly calc: PosCalculationService,
    private readonly stores: StoresService,
  ) {}

  async createSale(
    dto: CreatePosSaleDto,
    user?: AuthUser,
  ): Promise<PosSaleReceipt> {
    const clientSaleId = dto.clientSaleId.trim();
    if (!clientSaleId) {
      throw new BadRequestException('clientSaleId is required');
    }

    const idempotencyKey = this.buildIdempotencyKey(clientSaleId);
    const cached = await this.getCachedReceipt(idempotencyKey);
    if (cached) return cached;

    // Load store calculation policy BEFORE the transaction (async-safe).
    const storeId = dto.storeId ?? user?.storeId ?? 'default-store';
    const storePolicy = await this.calc.getPolicy(storeId);

    // Validate payment methods against store's kasirPaymentMethods setting.
    // Fail-open: if setting is empty, all methods are allowed.
    await this.validatePaymentMethods(dto.payments.map((p) => p.method), storeId);

    try {
      const receipt = await this.prisma.$transaction(async (tx) => {
        await tx.idempotency_keys.create({
          data: {
            key: idempotencyKey,
            result: JSON.stringify({ status: 'processing' }),
            expires_at: this.expiresAt(),
          },
        });

        const now = new Date().toISOString();
        const cashierId = dto.cashierId || user?.actor || 'pos-cashier';
        const customerName = dto.customerName?.trim() || `POS-${cashierId}`;

        const session = await tx.cash_register_sessions.findUnique({
          where: { id: dto.registerSessionId },
        });
        if (!session) {
          throw new NotFoundException(
            `Register session #${dto.registerSessionId} not found`,
          );
        }
        if (session.status !== RegisterSessionStatus.OPEN) {
          throw new BadRequestException(
            `Register session #${dto.registerSessionId} is ${session.status}`,
          );
        }
        if (session.store_id !== storeId) {
          throw new BadRequestException(
            `Register session #${dto.registerSessionId} belongs to store ${session.store_id}`,
          );
        }

        const productIds = dto.items.map((item) => item.productId);
        if (new Set(productIds).size !== productIds.length) {
          throw new BadRequestException(
            'Duplicate productId lines are not supported in one POS sale',
          );
        }

        const products = await tx.menu.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            is_stock_tracked: true,
          },
        });
        if (products.length !== productIds.length) {
          throw new BadRequestException('Ada produk yang tidak tersedia');
        }

        const productMap = new Map<number, MenuRow>(
          products.map((product) => [product.id, product]),
        );

        // ── Validate stock before calculation ──────────────────────────────
        for (const item of dto.items) {
          const product = productMap.get(item.productId);
          if (!product) {
            throw new BadRequestException(
              `Produk #${item.productId} tidak ditemukan`,
            );
          }
          if ((product.is_stock_tracked ?? true) && product.stock < item.qty) {
            throw new BadRequestException(
              `Stok ${product.name} tidak cukup. Tersisa ${product.stock}`,
            );
          }
        }

        // ── Centralized calculation (DB prices, discount/tax/sc policy) ────
        // Price override is blocked: unitPrice from DTO is ignored.
        const calcResult = this.calc.calculateWithPolicy(
          {
            lines: dto.items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: product.id,
                name: product.name,
                qty: item.qty,
                dbPrice: product.price,
                lineDiscountAmount: undefined, // line discount not yet in DTO
              };
            }),
            orderDiscountAmount: dto.discountAmount,
            discountReason: dto.discountReason,
            taxAmountOverride: dto.taxAmount,
            serviceChargeAmountOverride: dto.serviceChargeAmount,
            taxModeOverride: dto.taxMode,
          },
          // Policy is loaded outside the transaction; pass defaults here.
          // The policy was already loaded before the transaction started.
          storePolicy,
        );

        const {
          lines: calcLines,
          subtotal,
          orderDiscountAmount: discountAmount,
          taxAmount,
          taxMode,
          serviceChargeAmount,
          total,
          discountReason,
        } = calcResult;

        // ── Validate payment allocation ────────────────────────────────────
        this.calc.validatePaymentAllocation(
          dto.payments.map((p) => ({
            method: p.method,
            amount: Number(p.amount),
            paidAmount:
              p.paidAmount !== undefined ? Number(p.paidAmount) : undefined,
          })),
          total,
        );

        const receiptItems = calcLines.map((line) => ({
          productId: line.productId,
          name: line.name,
          qty: line.qty,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        }));

        const paidTotal = this.calc.round(
          dto.payments.reduce((sum, paymentLine) => {
            const isCash = this.calc.isCash(paymentLine.method);
            const effective = isCash
              ? Number(paymentLine.paidAmount ?? paymentLine.amount)
              : Number(paymentLine.amount);
            return sum + effective;
          }, 0),
        );
        const change = this.calc.round(Math.max(paidTotal - total, 0));

        const primaryPaymentMethod =
          dto.payments[0]?.method ?? PaymentMethod.CASH;
        const orderUser = await this.users.ensureUserByPhone(
          dto.customerPhone || cashierId,
          tx,
        );

        const order = await tx.orders.create({
          data: {
            user_id: orderUser.userId,
            type: dto.orderType,
            name: customerName,
            phone: orderUser.phoneDigits,
            address: '',
            payment_method: primaryPaymentMethod,
            status: OrderStatus.CONFIRMED,
            created_at: now,
          },
        });

        for (const item of receiptItems) {
          const product = productMap.get(item.productId)!;
          const isStockTracked = product.is_stock_tracked ?? true;

          await tx.order_items.create({
            data: {
              order_id: order.id,
              menu_id: item.productId,
              name: item.name,
              price: item.unitPrice,
              qty: item.qty,
            },
          });

          if (isStockTracked) {
            const qtyChange = -Math.abs(item.qty);
            const qtyAfter = product.stock + qtyChange;

            await tx.menu.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.qty } },
            });

            await tx.stock_change_logs.create({
              data: {
                menu_id: item.productId,
                order_id: order.id,
                change_type: StockMovementType.SALE,
                qty_before: product.stock,
                qty_change: qtyChange,
                qty_after: qtyAfter,
                note: `POS sale ${clientSaleId}`,
                store_id: storeId,
                operator_id: cashierId,
                source_ref: clientSaleId,
                created_at: now,
              },
            });

            await this.sync.writeOutboxInTx(
              tx,
              STOCK_EVENTS.ADJUSTED,
              {
                orderId: order.id,
                productId: item.productId,
                qtyChange,
                qtyAfter,
                reason: StockMovementType.SALE,
              },
              { source: 'pos', storeId, correlationId: clientSaleId },
            );
          }
        }

        const paymentMethods: string[] = [];
        const paymentLines: PosSaleReceipt['paymentLines'] = [];
        let cashDrawerIncrease = 0;
        for (const paymentLine of dto.payments) {
          const isCash = this.calc.isCash(paymentLine.method);
          // For cash: use physical paidAmount; for non-cash: paidAmount = amount
          const effectivePaid = isCash
            ? Number(paymentLine.paidAmount ?? paymentLine.amount)
            : Number(paymentLine.amount);

          const payment = await tx.payments.create({
            data: {
              order_id: order.id,
              store_id: storeId,
              amount: Number(paymentLine.amount),
              paid_amount: effectivePaid,
              discount: discountAmount,
              tax: taxAmount,
              payment_method: paymentLine.method,
              status: PaymentStatus.PAID,
              completed_at: now,
              created_at: now,
            },
          });

          paymentMethods.push(paymentLine.method);
          paymentLines.push({
            method: paymentLine.method,
            amount: Number(paymentLine.amount),
            paidAmount: effectivePaid,
            reference: paymentLine.reference,
          });

          await this.sync.writeOutboxInTx(
            tx,
            PAYMENT_EVENTS.CONFIRMED,
            {
              orderId: order.id,
              paymentId: payment.id,
              amount: paymentLine.amount,
              paidAmount: effectivePaid,
              paymentMethod: paymentLine.method,
            },
            { source: 'pos', storeId, correlationId: clientSaleId },
          );

          const cashflow = await tx.cashflow_entries.create({
            data: {
              session_id: dto.registerSessionId,
              store_id: storeId,
              entry_type: CashflowEntryType.INCOME,
              amount: Number(paymentLine.amount),
              payment_method: paymentLine.method,
              reference_type: 'order',
              reference_id: String(order.id),
              category: 'pos_sale',
              note: this.calc.isCash(paymentLine.method)
                ? `POS cash sale ${clientSaleId}`
                : `POS non-cash sale ${clientSaleId}`,
              operator_id: cashierId,
              created_at: now,
            },
          });

          await this.sync.writeOutboxInTx(
            tx,
            CASHFLOW_EVENTS.INCOME_RECORDED,
            {
              orderId: order.id,
              entryId: cashflow.id,
              sessionId: dto.registerSessionId,
              amount: paymentLine.amount,
              paymentMethod: paymentLine.method,
            },
            { source: 'pos', storeId, correlationId: clientSaleId },
          );

          if (this.calc.isCash(paymentLine.method)) {
            cashDrawerIncrease += Number(paymentLine.amount);
          }
        }

        if (cashDrawerIncrease > 0) {
          await tx.cash_register_sessions.update({
            where: { id: dto.registerSessionId },
            data: { expected_cash: { increment: cashDrawerIncrease } },
          });
        }

        await this.sync.writeOutboxInTx(
          tx,
          ORDER_EVENTS.CREATED,
          {
            orderId: order.id,
            total,
            type: dto.orderType,
            paymentMethod: primaryPaymentMethod,
            itemCount: dto.items.length,
          },
          { source: 'pos', storeId, correlationId: clientSaleId },
        );
        await this.sync.writeOutboxInTx(
          tx,
          ORDER_EVENTS.CONFIRMED,
          {
            orderId: order.id,
            total,
            paymentMethods,
          },
          { source: 'pos', storeId, correlationId: clientSaleId },
        );

        const receiptNumber = await this.nextReceiptNumber(
          tx,
          storeId,
          dto.registerSessionId,
          now,
        );
        const sale = await tx.pos_sales.create({
          data: {
            receipt_number: receiptNumber,
            client_sale_id: clientSaleId,
            order_id: order.id,
            register_session_id: dto.registerSessionId,
            cashier_id: cashierId,
            store_id: storeId,
            customer_name: customerName,
            customer_phone: dto.customerPhone ?? null,
            order_type: dto.orderType,
            status: PosSaleStatus.PAID,
            subtotal: this.roundMoney(subtotal),
            discount_amount: discountAmount,
            discount_reason: discountReason ?? null,
            tax_amount: taxAmount,
            tax_mode: taxMode,
            service_charge_amount: serviceChargeAmount,
            total,
            paid_total: paidTotal,
            change_amount: change,
            payment_methods: JSON.stringify(paymentMethods),
            payment_lines: JSON.stringify(paymentLines),
            created_at: now,
          },
        });

        await tx.pos_sale_items.createMany({
          data: receiptItems.map((item) => ({
            sale_id: sale.id,
            product_id: item.productId,
            name: item.name,
            qty: item.qty,
            unit_price: item.unitPrice,
            line_total: item.lineTotal,
            created_at: now,
          })),
        });

        await this.sync.writeOutboxInTx(
          tx,
          POS_SALE_EVENTS.RECEIPT_ISSUED,
          {
            saleId: sale.id,
            orderId: order.id,
            receiptNumber,
            total,
            paidTotal,
          },
          { source: 'pos', storeId, correlationId: clientSaleId },
        );

        await tx.audit_logs.create({
          data: {
            actor: cashierId,
            action: ORDER_EVENTS.CONFIRMED,
            resource: 'orders',
            resource_id: String(order.id),
            after_value: JSON.stringify({
              clientSaleId,
              receiptNumber,
              subtotal: this.roundMoney(subtotal),
              discountAmount,
              discountReason,
              taxAmount,
              taxMode,
              serviceChargeAmount,
              total,
              paymentMethods,
              paymentLines,
              registerSessionId: dto.registerSessionId,
            }),
            tenant_id: user?.tenantId ?? 'default',
            store_id: storeId,
            correlation_id: clientSaleId,
            channel: user?.channel ?? 'api',
          },
        });

        const receipt: PosSaleReceipt = {
          saleId: clientSaleId,
          orderId: order.id,
          receiptNumber,
          registerSessionId: dto.registerSessionId,
          cashierId,
          customerName,
          subtotal: this.roundMoney(subtotal),
          discountAmount,
          discountReason,
          taxAmount,
          taxMode,
          serviceChargeAmount,
          total,
          paidTotal,
          change,
          paymentMethods,
          paymentLines,
          items: receiptItems,
          createdAt: now,
        };

        await tx.idempotency_keys.update({
          where: { key: idempotencyKey },
          data: {
            result: JSON.stringify(receipt),
            expires_at: this.expiresAt(),
          },
        });

        return receipt;
      });

      this.refreshReports();
      return receipt;
    } catch (err: unknown) {
      if (this.isUniqueConstraintError(err)) {
        const receipt = await this.getCachedReceipt(idempotencyKey);
        if (receipt) return receipt;
        throw new ConflictException(
          'Duplicate clientSaleId is already running',
        );
      }
      throw err;
    }
  }

  async getReceiptByOrderId(orderId: number): Promise<PosSaleReceipt> {
    const persistedSale = await this.prisma.pos_sales.findUnique({
      where: { order_id: orderId },
      include: { pos_sale_items: true },
    });
    if (persistedSale) {
      return {
        saleId: persistedSale.client_sale_id ?? String(persistedSale.id),
        orderId: persistedSale.order_id,
        receiptNumber: persistedSale.receipt_number,
        registerSessionId: persistedSale.register_session_id,
        cashierId: persistedSale.cashier_id,
        customerName: persistedSale.customer_name ?? '',
        subtotal: this.roundMoney(Number(persistedSale.subtotal)),
        discountAmount: this.roundMoney(Number(persistedSale.discount_amount)),
        discountReason: persistedSale.discount_reason ?? undefined,
        taxAmount: this.roundMoney(Number(persistedSale.tax_amount)),
        taxMode: persistedSale.tax_mode as PosSaleReceipt['taxMode'],
        serviceChargeAmount: this.roundMoney(
          Number(persistedSale.service_charge_amount),
        ),
        total: this.roundMoney(Number(persistedSale.total)),
        paidTotal: this.roundMoney(Number(persistedSale.paid_total)),
        change: this.roundMoney(Number(persistedSale.change_amount)),
        paymentMethods: this.parseJsonArray<string>(
          persistedSale.payment_methods,
        ),
        paymentLines: this.parseJsonArray<
          PosSaleReceipt['paymentLines'][number]
        >(persistedSale.payment_lines),
        items: persistedSale.pos_sale_items.map((item) => ({
          productId: item.product_id,
          name: item.name,
          qty: item.qty,
          unitPrice: this.roundMoney(Number(item.unit_price)),
          lineTotal: this.roundMoney(Number(item.line_total)),
        })),
        createdAt: persistedSale.created_at,
      };
    }

    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: true,
        payments: true,
      },
    });
    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found`);
    }

    const [cashflow, audit] = await Promise.all([
      this.prisma.cashflow_entries.findFirst({
        where: {
          reference_type: 'order',
          reference_id: String(orderId),
          category: 'pos_sale',
        },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.audit_logs.findFirst({
        where: {
          resource: 'orders',
          resource_id: String(orderId),
          action: ORDER_EVENTS.CONFIRMED,
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const auditMeta = this.parseAuditReceiptMeta(audit?.after_value);
    const items = order.order_items.map((item) => ({
      productId: item.menu_id,
      name: item.name,
      qty: item.qty,
      unitPrice: Number(item.price),
      lineTotal: this.roundMoney(Number(item.price) * item.qty),
    }));
    const subtotal = this.roundMoney(
      items.reduce((sum, item) => sum + item.lineTotal, 0),
    );

    const payments = order.payments ?? [];
    const paymentMethods =
      payments.length > 0
        ? [...new Set(payments.map((payment) => payment.payment_method))]
        : auditMeta.paymentMethods.length > 0
          ? auditMeta.paymentMethods
          : order.payment_method
            ? [order.payment_method]
            : [];

    const discountAmount = this.roundMoney(
      payments.length > 0
        ? Math.max(
            0,
            ...payments.map((payment) => Number(payment.discount ?? 0)),
          )
        : (auditMeta.discountAmount ?? 0),
    );
    const taxAmount = this.roundMoney(
      payments.length > 0
        ? Math.max(0, ...payments.map((payment) => Number(payment.tax ?? 0)))
        : (auditMeta.taxAmount ?? 0),
    );
    const serviceChargeAmount = this.roundMoney(
      auditMeta.serviceChargeAmount ?? 0,
    );
    const total = this.roundMoney(
      payments.length > 0
        ? payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
        : subtotal - discountAmount + taxAmount + serviceChargeAmount,
    );
    const paidTotal = this.roundMoney(
      payments.length > 0
        ? payments.reduce(
            (sum, payment) =>
              sum + Number(payment.paid_amount || payment.amount),
            0,
          )
        : total,
    );
    const hasCashPayment = paymentMethods.some((method) =>
      this.isCashPayment(method),
    );
    const registerSessionId =
      cashflow?.session_id ?? auditMeta.registerSessionId ?? 0;
    const saleId =
      audit?.correlation_id ?? auditMeta.clientSaleId ?? `order-${order.id}`;

    // Reconstruct per-line payment breakdown
    const paymentLines: PosSaleReceipt['paymentLines'] = payments.map((p) => ({
      method: p.payment_method,
      amount: this.roundMoney(Number(p.amount)),
      paidAmount: this.roundMoney(Number(p.paid_amount || p.amount)),
      reference: undefined,
    }));

    return {
      saleId,
      orderId: order.id,
      receiptNumber: `POS-${registerSessionId || 'NA'}-${order.id}`,
      registerSessionId,
      cashierId: cashflow?.operator_id ?? audit?.actor ?? 'unknown',
      customerName: order.name,
      subtotal,
      discountAmount,
      discountReason: auditMeta.discountReason,
      taxAmount,
      taxMode: auditMeta.taxMode,
      serviceChargeAmount,
      total,
      paidTotal,
      change: hasCashPayment
        ? this.roundMoney(Math.max(paidTotal - total, 0))
        : 0,
      paymentMethods,
      paymentLines,
      items,
      createdAt: order.created_at,
    };
  }

  /**
   * Validates that all payment methods used in a sale are in the store's
   * allowed kasirPaymentMethods list. Fail-open: if the setting is empty,
   * any method is accepted (backward compatibility).
   */
  private async validatePaymentMethods(
    methods: string[],
    storeId: string,
  ): Promise<void> {
    const raw = await this.stores.getSetting('kasirPaymentMethods', '', storeId);
    if (!raw.trim()) return; // setting not configured → allow all

    const allowed = raw.split(',').map((m) => m.trim().toLowerCase());
    for (const method of methods) {
      if (!allowed.includes(method.toLowerCase())) {
        throw new BadRequestException(
          `Metode pembayaran "${method}" tidak diizinkan. Diizinkan: ${allowed.join(', ')}`,
        );
      }
    }
  }

  private buildIdempotencyKey(clientSaleId: string): string {
    return `pos-sale:${clientSaleId}`;
  }

  private expiresAt(): string {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.IDEMPOTENCY_TTL_SECONDS);
    return expiresAt.toISOString();
  }

  private async getCachedReceipt(
    idempotencyKey: string,
  ): Promise<PosSaleReceipt | null> {
    const row = await this.prisma.idempotency_keys.findFirst({
      where: {
        key: idempotencyKey,
        expires_at: { gt: new Date().toISOString() },
      },
    });
    if (!row) return null;

    try {
      const parsed = JSON.parse(row.result) as Partial<PosSaleReceipt> & {
        status?: string;
      };
      if (parsed.status === 'processing') {
        throw new ConflictException(
          'Duplicate clientSaleId is already running',
        );
      }
      if (typeof parsed.orderId === 'number' && parsed.saleId) {
        return parsed as PosSaleReceipt;
      }
      return null;
    } catch (err: unknown) {
      if (err instanceof ConflictException) throw err;
      return null;
    }
  }

  private isCashPayment(method: string): boolean {
    return this.calc.isCash(method);
  }

  private roundMoney(value: number): number {
    return this.calc.round(value);
  }

  private async nextReceiptNumber(
    tx: any,
    storeId: string,
    registerSessionId: number,
    now: string,
  ): Promise<string> {
    const businessDate = now.slice(0, 10);
    const compactDate = businessDate.replace(/-/g, '');
    const sequenceRow = await tx.receipt_sequences.upsert({
      where: {
        store_id_register_session_id_business_date: {
          store_id: storeId,
          register_session_id: registerSessionId,
          business_date: businessDate,
        },
      },
      update: {
        sequence: { increment: 1 },
        updated_at: now,
      },
      create: {
        store_id: storeId,
        register_session_id: registerSessionId,
        business_date: businessDate,
        sequence: 1,
        created_at: now,
        updated_at: now,
      },
    });
    const storeCode =
      storeId
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 8)
        .toUpperCase() || 'STORE';
    return `R-${storeCode}-${compactDate}-${registerSessionId}-${String(
      sequenceRow.sequence,
    ).padStart(4, '0')}`;
  }

  private parseJsonArray<T>(value?: string | null): T[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  private parseAuditReceiptMeta(value?: string | null): {
    clientSaleId?: string;
    registerSessionId?: number;
    discountAmount?: number;
    discountReason?: string;
    taxAmount?: number;
    taxMode?: PosSaleReceipt['taxMode'];
    serviceChargeAmount?: number;
    paymentMethods: string[];
  } {
    if (!value) return { paymentMethods: [] };
    try {
      const parsed = JSON.parse(value) as {
        clientSaleId?: unknown;
        registerSessionId?: unknown;
        discountAmount?: unknown;
        discountReason?: unknown;
        taxAmount?: unknown;
        taxMode?: unknown;
        serviceChargeAmount?: unknown;
        paymentMethods?: unknown;
      };
      return {
        clientSaleId:
          typeof parsed.clientSaleId === 'string'
            ? parsed.clientSaleId
            : undefined,
        registerSessionId:
          typeof parsed.registerSessionId === 'number'
            ? parsed.registerSessionId
            : undefined,
        discountAmount:
          typeof parsed.discountAmount === 'number'
            ? parsed.discountAmount
            : undefined,
        discountReason:
          typeof parsed.discountReason === 'string'
            ? parsed.discountReason
            : undefined,
        taxAmount:
          typeof parsed.taxAmount === 'number' ? parsed.taxAmount : undefined,
        taxMode:
          parsed.taxMode === PosTaxMode.INCLUSIVE ||
          parsed.taxMode === PosTaxMode.EXCLUSIVE
            ? parsed.taxMode
            : undefined,
        serviceChargeAmount:
          typeof parsed.serviceChargeAmount === 'number'
            ? parsed.serviceChargeAmount
            : undefined,
        paymentMethods: Array.isArray(parsed.paymentMethods)
          ? parsed.paymentMethods.filter(
              (method): method is string => typeof method === 'string',
            )
          : [],
      };
    } catch {
      return { paymentMethods: [] };
    }
  }

  private isUniqueConstraintError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    );
  }

  private refreshReports(): void {
    this.readModel.rebuildAll().catch((err: Error) => {
      this.logger.warn(
        `Report projection rebuild after POS sale failed: ${err.message}`,
      );
    });
  }
}
