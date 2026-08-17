import { Injectable, Logger } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { InventoryService } from '../inventory/inventory.service';
import { CartService } from '../chatbot/cart.service';
import { CheckoutService } from '../checkout/checkout.service';
import { HistoryService } from '../chatbot/history.service';
import { LlmService } from '../llm/llm.service';
import { ReportsService } from '../reports/reports.service';
import { NutritionAdvisorService } from '../llm/nutrition-advisor.service';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { StoresService } from '../stores/stores.service';
import { detectIntent, Intent } from '@bot/intents/intentDetector';
import {
  formatMenuList,
  formatProductDetail,
  formatHelpQuick,
  formatDeliveryRequestInstruction,
} from '@bot/formatters/menuFormatter';
import {
  formatIngredientReply,
  formatAllIngredientsReply,
  formatIngredientInventorySummaryReply,
  formatAllIngredientStocksReply,
  formatIngredientCategoryReply,
  formatSingleIngredientStockReply,
  formatLowStockIngredientsReply,
  formatOutOfStockSummaryReply,
  formatPopIceAvailabilityReply,
} from '@bot/formatters/ingredientFormatter';
import {
  formatReportReply,
  formatYearDetailReport,
  formatMonthReportReply,
  formatBestMonthReply,
} from '@bot/formatters/reportFormatter';
import { normalizeIngredientReference } from '@bot/intents/ingredientIntent';

export interface DispatchContext {
  userMessage: string;
  sender: string;
  conversationSender: string;
  resolvedName: string | null;
  userWaIdentity: string;
  imageUrl: string | null;
  isgroup: boolean;
}

export interface DispatchResult {
  reply: string;
  entryType: string;
  orderId?: number;
  totalPrice?: number;
  cartItems?: any[];
}

/** In-memory delivery sessions (TTL 30 min) */
const deliverySessions = new Map<
  string,
  { awaitingDetails: boolean; createdAt: number }
>();
const DELIVERY_TTL_MS = 30 * 60 * 1000;

function parseDeliveryDetails(
  message: string,
): { name: string; phone: string; address: string } | null {
  const text = String(message ?? '').trim();
  if (!text) return null;
  if (text.includes('|')) {
    const parts = text
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 3)
      return {
        name: parts[0],
        phone: parts[1],
        address: parts.slice(2).join(' | '),
      };
  }
  const nameMatch = text.match(/nama\s*:\s*(.+)/i);
  const phoneMatch = text.match(/(phone|telp|telepon|no hp|nomor)\s*:\s*(.+)/i);
  const addressMatch = text.match(/alamat\s*:\s*(.+)/i);
  if (!nameMatch || !phoneMatch || !addressMatch) return null;
  return {
    name: nameMatch[1].trim(),
    phone: phoneMatch[2].trim(),
    address: addressMatch[1].trim(),
  };
}

@Injectable()
export class BotDispatchService {
  private readonly logger = new Logger(BotDispatchService.name);

  /**
   * Intents that expose sensitive business data (sales reports, omzet, and
   * raw inventory/stock levels). These are owner-only and must NOT be served
   * to arbitrary customers chatting the public WhatsApp number.
   *
   * Customer-facing product info (menu, product_detail, ingredients_*,
   * nutrition) is intentionally NOT in this set.
   */
  private static readonly OWNER_ONLY_INTENTS = new Set<string>([
    'report_today',
    'report_year',
    'report_year_detail',
    'report_month',
    'report_best_month',
    'report_summary',
    'ingredient_summary',
    'ingredient_all_stock',
    'ingredient_by_category',
    'ingredient_single_stock',
    'ingredient_out_summary',
    'ingredient_low_stock',
    'ingredient_pop_ice',
  ]);

  constructor(
    private readonly catalog: CatalogService,
    private readonly inventory: InventoryService,
    private readonly cart: CartService,
    private readonly checkout: CheckoutService,
    private readonly history: HistoryService,
    private readonly llm: LlmService,
    private readonly reports: ReportsService,
    private readonly nutrition: NutritionAdvisorService,
    private readonly config: AppConfigService,
    private readonly stores: StoresService,
  ) {}

  /**
   * Main dispatch — routes an incoming message to the correct handler.
   * Called by BotController for every inbound Fonnte webhook.
   */
  async dispatch(ctx: DispatchContext): Promise<DispatchResult> {
    const {
      userMessage,
      conversationSender,
      sender,
      resolvedName,
      userWaIdentity,
      imageUrl,
      isgroup,
    } = ctx;

    // 1. Delivery follow-up takes priority
    const deliveryResult = await this.handleDeliveryFollowup(
      conversationSender,
      sender,
      resolvedName,
      userMessage,
    );
    if (deliveryResult !== null) return deliveryResult;

    // 2. Classify intent
    const intent = detectIntent(userMessage);
    const groupCommandPrefix = this.config.groupCommandPrefix;
    const prefixTriggeredInGroup =
      isgroup && userMessage.trim().startsWith(groupCommandPrefix);

    // 3. Route
    return this.route(intent, ctx, prefixTriggeredInGroup);
  }

  // ─── Router ────────────────────────────────────────────────────────────────

  private async route(
    intent: Intent,
    ctx: DispatchContext,
    prefixTriggeredInGroup: boolean,
  ): Promise<DispatchResult> {
    const {
      conversationSender,
      sender,
      resolvedName,
      userMessage,
      userWaIdentity,
      imageUrl,
      isgroup,
    } = ctx;

    // ── Owner-only data gate ───────────────────────────────────────────────
    // Sales reports & raw stock levels must only reach the store owner's
    // configured WhatsApp number(s). Everyone else gets a polite decline.
    if (
      BotDispatchService.OWNER_ONLY_INTENTS.has(intent.type) &&
      !(await this.isOwnerSender(sender))
    ) {
      return this.handleOwnerOnlyDenied();
    }

    switch (intent.type) {
      case 'menu':
        return this.handleMenu();
      case 'help_quick':
        return this.handleHelpQuick();
      case 'product_detail':
        return this.handleProductDetail(intent.productRef);
      case 'ingredients_single':
        return this.handleIngredientsSingle(intent.productRef);
      case 'ingredients_all':
        return this.handleIngredientsAll(intent.category ?? null);
      case 'nutrition_query':
        return this.handleNutritionQuery(
          intent.productRef,
          intent.topic,
          userMessage,
        );

      case 'cart_view':
        return this.handleCartView(conversationSender);
      case 'cart_add':
        return this.handleCartAdd(
          intent.productRef,
          intent.qty ?? 1,
          conversationSender,
        );
      case 'cart_remove':
        return this.handleCartRemove(intent.productRef, conversationSender);
      case 'cart_clear':
        return this.handleCartClear(conversationSender);
      case 'checkout':
        return this.handleCheckout(
          intent.orderType,
          conversationSender,
          resolvedName,
          sender,
        );

      case 'ingredient_summary':
        return this.handleIngredientSummary();
      case 'ingredient_all_stock':
        return this.handleIngredientAllStock();
      case 'ingredient_by_category':
        return this.handleIngredientByCategory(intent.category);
      case 'ingredient_single_stock':
        return this.handleIngredientSingleStock(intent.ingredientRef);
      case 'ingredient_out_summary':
        return this.handleIngredientOutSummary();
      case 'ingredient_low_stock':
        return this.handleIngredientLowStock();
      case 'ingredient_pop_ice':
        return this.handleIngredientPopIce();

      case 'report_today':
        return this.handleReportToday();
      case 'report_year':
        return this.handleReportYear(intent.year);
      case 'report_year_detail':
        return this.handleReportYearDetail(intent.year);
      case 'report_month':
        return this.handleReportMonth(intent.year, intent.month);
      case 'report_best_month':
        return this.handleReportBestMonth(intent.year);
      case 'report_summary':
        return this.handleReportSummary();

      // ── Favorites ────────────────────────────────────────────────────────
      // The favorites table exists in the schema but the bot has no user
      // identity model (it uses phone numbers, not user IDs). These intents
      // are detected but cannot be fulfilled without a phone→user lookup.
      // Return a clear, honest response instead of silently falling through
      // to AI (which would give a confusing or hallucinated answer).
      case 'favorite_list':
      case 'favorite_add':
      case 'favorite_remove':
        return this.handleFavoritesUnsupported(intent.type);

      default: // ai_fallback
        return this.handleAiFallback({
          userMessage,
          conversationSender,
          userWaIdentity,
          imageUrl,
          isgroup,
          prefixTriggeredInGroup,
        });
    }
  }

  // ─── Catalog handlers ──────────────────────────────────────────────────────

  private async handleMenu(): Promise<DispatchResult> {
    const products = await this.catalog.getAllProducts(this.config.defaultStoreId);
    return { reply: formatMenuList(products), entryType: 'catalog' };
  }

  private handleHelpQuick(): DispatchResult {
    return { reply: formatHelpQuick(), entryType: 'catalog' };
  }

  private async handleProductDetail(
    productRef: string,
  ): Promise<DispatchResult> {
    const product = await this.resolveProductRef(productRef);
    return { reply: formatProductDetail(product), entryType: 'catalog' };
  }

  private async handleIngredientsSingle(
    productRef: string,
  ): Promise<DispatchResult> {
    const product = await this.resolveProductRef(productRef);
    return { reply: formatIngredientReply(product), entryType: 'nutrition' };
  }

  private async handleIngredientsAll(
    category: string | null,
  ): Promise<DispatchResult> {
    const products = await this.catalog.getAllProducts(this.config.defaultStoreId);
    return {
      reply: formatAllIngredientsReply(products, category),
      entryType: 'nutrition',
    };
  }

  private async handleNutritionQuery(
    productRef: string,
    topic: string,
    userMessage: string,
  ): Promise<DispatchResult> {
    let product = await this.resolveProductRef(productRef);
    if (!product) {
      // Fuzzy match from full catalog
      const products = await this.catalog.getAllProducts(this.config.defaultStoreId);
      const lowered = userMessage.toLowerCase();
      product =
        products.find((p) => lowered.includes(p.name.toLowerCase())) ?? null;
    }
    if (!product) {
      const products = await this.catalog.getAllProducts(this.config.defaultStoreId);
      const examples = products
        .slice(0, 6)
        .map((p) => p.name)
        .join(', ');
      return {
        reply: [
          'Saya belum bisa menentukan produk yang kamu maksud.',
          'Coba sebut nama menu lebih spesifik, contoh:',
          '- kandungan gizi Nasi Goreng',
          '- berapa kalori Milo',
          '',
          `Menu yang tersedia: ${examples}`,
        ].join('\n'),
        entryType: 'nutrition',
      };
    }
    return {
      reply: this.nutrition.formatNutritionReply(product.name, topic as any),
      entryType: 'nutrition',
    };
  }

  // ─── Cart handlers ─────────────────────────────────────────────────────────

  private async handleCartView(sender: string): Promise<DispatchResult> {
    const c = await this.cart.getCart(sender);
    return {
      reply: this.cart.formatCartForMessage(c),
      entryType: 'cart',
      cartItems: c.items,
      totalPrice: c.total,
    };
  }

  private async handleCartAdd(
    productRef: string,
    qty: number,
    sender: string,
  ): Promise<DispatchResult> {
    const product = await this.resolveProductRef(productRef);
    if (!product)
      return {
        reply: 'Produk tidak ditemukan. Ketik menu untuk lihat daftar produk.',
        entryType: 'cart',
      };
    try {
      const c = await this.cart.addItemToCart(sender, product.id, qty);
      return {
        reply: `${product.name} x${qty} berhasil ditambahkan.\n${this.cart.formatCartForMessage(c)}`,
        entryType: 'cart',
        cartItems: c.items,
        totalPrice: c.total,
      };
    } catch (err: any) {
      return { reply: err.message, entryType: 'cart' };
    }
  }

  private async handleCartRemove(
    productRef: string,
    sender: string,
  ): Promise<DispatchResult> {
    const result = await this.cart.removeItemFromCart(sender, productRef);
    return {
      reply: result.removed
        ? `Item berhasil dihapus.\n${this.cart.formatCartForMessage(result.cart)}`
        : 'Item tidak ditemukan di keranjang.',
      entryType: 'cart',
      cartItems: result.cart.items,
      totalPrice: result.cart.total,
    };
  }

  private async handleCartClear(sender: string): Promise<DispatchResult> {
    const c = await this.cart.clearCart(sender);
    return {
      reply: 'Keranjang berhasil dikosongkan.',
      entryType: 'cart',
      cartItems: c.items,
      totalPrice: c.total,
    };
  }

  // ─── Checkout handlers ─────────────────────────────────────────────────────

  private async handleCheckout(
    orderType: string,
    conversationSender: string,
    resolvedName: string | null,
    sender: string,
  ): Promise<DispatchResult> {
    if (orderType === 'delivery') {
      const c = await this.cart.getCart(conversationSender);
      if (!c.items.length)
        return {
          reply:
            'Keranjang masih kosong. Tambahkan item dulu sebelum checkout delivery.',
          entryType: 'checkout',
        };
      deliverySessions.set(conversationSender, {
        awaitingDetails: true,
        createdAt: Date.now(),
      });
      return {
        reply: formatDeliveryRequestInstruction(),
        entryType: 'checkout',
      };
    }
    return this.doCheckout({
      sender: conversationSender,
      customerName: resolvedName ?? sender,
      orderType,
    });
  }

  private async handleDeliveryFollowup(
    conversationSender: string,
    sender: string,
    resolvedName: string | null,
    userMessage: string,
  ): Promise<DispatchResult | null> {
    const session = deliverySessions.get(conversationSender);
    if (!session?.awaitingDetails) return null;
    if (Date.now() - session.createdAt > DELIVERY_TTL_MS) {
      deliverySessions.delete(conversationSender);
      return null;
    }
    const details = parseDeliveryDetails(userMessage);
    if (!details) {
      return {
        reply: [
          'Format data delivery belum lengkap.',
          formatDeliveryRequestInstruction(),
        ].join('\n\n'),
        entryType: 'checkout',
      };
    }
    deliverySessions.delete(conversationSender);
    return this.doCheckout({
      sender: conversationSender,
      customerName: details.name,
      orderType: 'delivery',
      phone: details.phone,
      address: details.address,
    });
  }

  private async doCheckout(opts: {
    sender: string;
    customerName?: string;
    orderType?: string;
    phone?: string;
    address?: string;
  }): Promise<DispatchResult> {
    try {
      const order = await this.checkout.createOrderFromCart(opts);
      return {
        reply: this.checkout.formatCheckoutSuccess(order),
        entryType: 'checkout',
        orderId: order.orderId,
        totalPrice: order.displayTotal,
        cartItems: order.items,
      };
    } catch (err: any) {
      return { reply: err.message, entryType: 'checkout' };
    }
  }

  // ─── Inventory handlers ────────────────────────────────────────────────────

  private async handleIngredientSummary(): Promise<DispatchResult> {
    const summary = await this.inventory.getIngredientSummaryByCategory();
    return {
      reply: formatIngredientInventorySummaryReply(
        Array.isArray(summary) ? summary : [],
      ),
      entryType: 'inventory',
    };
  }

  private async handleIngredientAllStock(): Promise<DispatchResult> {
    const [globalStats, items] = await Promise.all([
      this.inventory.getIngredientGlobalStats(),
      this.inventory.getAllIngredientStocks(300),
    ]);
    return {
      reply: formatAllIngredientStocksReply(items as any[], globalStats),
      entryType: 'inventory',
    };
  }

  private async handleIngredientByCategory(
    category: string,
  ): Promise<DispatchResult> {
    const items = await this.inventory.getIngredientsByCategory(category, 25);
    return {
      reply: formatIngredientCategoryReply(category, items as any[]),
      entryType: 'inventory',
    };
  }

  private async handleIngredientSingleStock(
    ingredientRef: string,
  ): Promise<DispatchResult> {
    const cleanedRef = normalizeIngredientReference(ingredientRef);
    const item = await this.inventory.searchIngredientByName(
      cleanedRef || ingredientRef,
    );
    if (item)
      return {
        reply: formatSingleIngredientStockReply(item as any),
        entryType: 'inventory',
      };
    const product = await this.resolveProductRef(cleanedRef || ingredientRef);
    return {
      reply: product
        ? formatProductDetail(product)
        : 'Bahan atau produk tidak ditemukan. Coba: stok beras ada berapa, stok bahan minuman, atau menu.',
      entryType: 'inventory',
    };
  }

  private async handleIngredientOutSummary(): Promise<DispatchResult> {
    const [globalStats, outItems] = await Promise.all([
      this.inventory.getIngredientGlobalStats(),
      this.inventory.getOutOfStockIngredients(200),
    ]);
    return {
      reply: formatOutOfStockSummaryReply(globalStats, outItems as any[]),
      entryType: 'inventory',
    };
  }

  private async handleIngredientLowStock(): Promise<DispatchResult> {
    const items = await this.inventory.getLowStockIngredients(20);
    return {
      reply: formatLowStockIngredientsReply(items as any[]),
      entryType: 'inventory',
    };
  }

  private async handleIngredientPopIce(): Promise<DispatchResult> {
    const items = await this.inventory.getPopIceAvailability();
    return {
      reply: formatPopIceAvailabilityReply(items as any[]),
      entryType: 'inventory',
    };
  }

  // ─── Report handlers ───────────────────────────────────────────────────────

  private async handleReportToday(): Promise<DispatchResult> {
    const today = new Date().toISOString().slice(0, 10);
    const sales = await this.reports.getSalesForDate(today);
    return {
      reply: formatReportReply('Laporan penjualan hari ini', sales),
      entryType: 'report',
    };
  }

  private async handleReportYear(year: number): Promise<DispatchResult> {
    if (!this.isValidYear(year))
      return {
        reply: 'Format tahun tidak valid. Contoh: total penghasilan tahun 2025',
        entryType: 'report',
      };
    const sales = await this.reports.getSalesForYear(year);
    return {
      reply: formatReportReply(`Laporan penjualan tahun ${year}`, sales),
      entryType: 'report',
    };
  }

  private async handleReportYearDetail(year: number): Promise<DispatchResult> {
    if (!this.isValidYear(year))
      return { reply: 'Format tahun tidak valid.', entryType: 'report' };
    const { yearSales, monthlyBreakdown, topProducts } =
      await this.reports.getYearDetailBundle(year);
    return {
      reply: formatYearDetailReport(
        year,
        yearSales,
        monthlyBreakdown,
        topProducts,
      ),
      entryType: 'report',
    };
  }

  private async handleReportMonth(
    year: number,
    month: number,
  ): Promise<DispatchResult> {
    if (!this.isValidYear(year) || !this.isValidMonth(month)) {
      return {
        reply:
          'Format bulan/tahun tidak valid. Contoh: laporan penjualan Maret 2025',
        entryType: 'report',
      };
    }
    const { monthSales, topProducts } = await this.reports.getMonthDetailBundle(
      year,
      month,
    );
    return {
      reply: formatMonthReportReply(year, month, monthSales, topProducts),
      entryType: 'report',
    };
  }

  private async handleReportBestMonth(year: number): Promise<DispatchResult> {
    if (!this.isValidYear(year))
      return { reply: 'Format tahun tidak valid.', entryType: 'report' };
    const monthlyBreakdown = await this.reports.getSalesMonthlyBreakdown(year);
    return {
      reply: formatBestMonthReply(year, monthlyBreakdown),
      entryType: 'report',
    };
  }

  private async handleReportSummary(): Promise<DispatchResult> {
    const sales = await this.reports.getSalesSummary();
    return {
      reply: formatReportReply('Ringkasan seluruh penjualan sukses', sales),
      entryType: 'report',
    };
  }

  // ─── AI fallback ───────────────────────────────────────────────────────────

  private async handleAiFallback(opts: {
    userMessage: string;
    conversationSender: string;
    userWaIdentity: string;
    imageUrl: string | null;
    isgroup: boolean;
    prefixTriggeredInGroup: boolean;
  }): Promise<DispatchResult> {
    const {
      userMessage,
      conversationSender,
      userWaIdentity,
      isgroup,
      prefixTriggeredInGroup,
    } = opts;

    // Group prefix command not recognized → deterministic error
    if (isgroup && prefixTriggeredInGroup) {
      const prefix = this.config.groupCommandPrefix;
      return {
        reply: [
          'Perintah belum dikenali.',
          `Coba ${prefix}stok <nama barang> atau ${prefix}penjualan hari ini.`,
          `Contoh: ${prefix}harga kaos hitam`,
        ].join('\n'),
        entryType: 'chat',
      };
    }

    const [historyTurns, catalogContext, cartData] = await Promise.all([
      this.history.getHistoryBySender(conversationSender, 10),
      this.catalog.getCatalogContext(this.config.defaultStoreId),
      this.cart.getCart(conversationSender),
    ]);

    const cartContext = this.cart.formatCartForMessage(cartData);

    const reply = await this.llm.chat({
      sender: conversationSender,
      message: userMessage,
      role: 'customer',
      history: historyTurns,
      context: { catalogContext, cartContext },
    });

    return { reply, entryType: 'chat' };
  }

  // ─── Favorites (not yet supported) ────────────────────────────────────────

  /**
   * Favorites require a phone→user_id lookup that the bot doesn't have yet.
   * Return a clear message instead of falling through to AI fallback.
   *
   * TODO: implement once the users table has a phone column and the bot
   * can resolve conversationSender → user_id reliably.
   */
  private handleFavoritesUnsupported(
    intentType: 'favorite_list' | 'favorite_add' | 'favorite_remove',
  ): DispatchResult {
    const messages: Record<string, string> = {
      favorite_list: [
        'Fitur daftar favorit belum tersedia di bot WhatsApp.',
        'Kamu bisa lihat menu lengkap dengan mengetik *menu*.',
      ].join('\n'),
      favorite_add: [
        'Fitur tambah favorit belum tersedia di bot WhatsApp.',
        'Untuk memesan, ketik *tambah <nama produk>* untuk menambah ke keranjang.',
      ].join('\n'),
      favorite_remove: [
        'Fitur hapus favorit belum tersedia di bot WhatsApp.',
        'Ketik *menu* untuk melihat produk yang tersedia.',
      ].join('\n'),
    };
    return {
      reply: messages[intentType] ?? 'Fitur favorit belum tersedia.',
      entryType: 'chat',
    };
  }

  // ─── Owner gating ────────────────────────────────────────────────────────

  /**
   * Polite decline shown when a non-owner triggers an owner-only intent
   * (sales reports / stock levels) on the public WhatsApp number.
   */
  private handleOwnerOnlyDenied(): DispatchResult {
    return {
      reply: [
        'Maaf, informasi laporan penjualan & stok hanya untuk pemilik toko. 🙏',
        'Ketik *menu* untuk melihat produk yang tersedia.',
      ].join('\n'),
      entryType: 'chat',
    };
  }

  /**
   * True if the sender's WhatsApp number is in the store's admin allowlist,
   * configured via Bot Settings → "Nomor WA Admin" (setting key: adminPhones).
   *
   * Fail-closed: if no admin numbers are configured or the lookup fails,
   * NO ONE is treated as owner over WhatsApp (sensitive data stays hidden).
   */
  private async isOwnerSender(sender: string): Promise<boolean> {
    try {
      const settings = await this.stores.getSettings(this.config.defaultStoreId);
      const raw = settings['adminPhones'] ?? '';
      if (!raw.trim()) return false;
      const allow = raw
        .split(/[\s,;]+/)
        .map((entry) => this.normalizePhone(entry))
        .filter(Boolean);
      return allow.includes(this.normalizePhone(sender));
    } catch {
      return false;
    }
  }

  /** Canonicalize an Indonesian phone number to "62…" digits for comparison. */
  private normalizePhone(phone: string): string {
    let d = String(phone ?? '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('0')) d = '62' + d.slice(1);
    else if (d.startsWith('8')) d = '62' + d;
    return d;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async resolveProductRef(productRef: string | number): Promise<any> {
    const maybeId = Number(productRef);
    if (Number.isInteger(maybeId) && maybeId > 0)
      return this.catalog.getProductById(maybeId, this.config.defaultStoreId);
    return this.catalog.findProductByName(
      String(productRef),
      this.config.defaultStoreId,
    );
  }

  private isValidYear(year: number): boolean {
    return Number.isInteger(year) && year >= 2000 && year <= 2100;
  }

  private isValidMonth(month: number): boolean {
    return Number.isInteger(month) && month >= 1 && month <= 12;
  }
}
