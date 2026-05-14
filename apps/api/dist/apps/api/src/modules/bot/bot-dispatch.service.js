"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BotDispatchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotDispatchService = void 0;
const common_1 = require("@nestjs/common");
const catalog_service_1 = require("../catalog/catalog.service");
const inventory_service_1 = require("../inventory/inventory.service");
const cart_service_1 = require("../chatbot/cart.service");
const checkout_service_1 = require("../checkout/checkout.service");
const history_service_1 = require("../chatbot/history.service");
const llm_service_1 = require("../llm/llm.service");
const reports_service_1 = require("../reports/reports.service");
const nutrition_advisor_service_1 = require("../llm/nutrition-advisor.service");
const app_config_service_1 = require("../../infrastructure/config/app-config.service");
const intentDetector_1 = require("../../../../bot/src/intents/intentDetector");
const menuFormatter_1 = require("../../../../bot/src/formatters/menuFormatter");
const ingredientFormatter_1 = require("../../../../bot/src/formatters/ingredientFormatter");
const reportFormatter_1 = require("../../../../bot/src/formatters/reportFormatter");
const ingredientIntent_1 = require("../../../../bot/src/intents/ingredientIntent");
const deliverySessions = new Map();
const DELIVERY_TTL_MS = 30 * 60 * 1000;
function parseDeliveryDetails(message) {
    const text = String(message ?? '').trim();
    if (!text)
        return null;
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
    if (!nameMatch || !phoneMatch || !addressMatch)
        return null;
    return {
        name: nameMatch[1].trim(),
        phone: phoneMatch[2].trim(),
        address: addressMatch[1].trim(),
    };
}
let BotDispatchService = BotDispatchService_1 = class BotDispatchService {
    constructor(catalog, inventory, cart, checkout, history, llm, reports, nutrition, config) {
        this.catalog = catalog;
        this.inventory = inventory;
        this.cart = cart;
        this.checkout = checkout;
        this.history = history;
        this.llm = llm;
        this.reports = reports;
        this.nutrition = nutrition;
        this.config = config;
        this.logger = new common_1.Logger(BotDispatchService_1.name);
    }
    async dispatch(ctx) {
        const { userMessage, conversationSender, sender, resolvedName, userWaIdentity, imageUrl, isgroup, } = ctx;
        const deliveryResult = await this.handleDeliveryFollowup(conversationSender, sender, resolvedName, userMessage);
        if (deliveryResult !== null)
            return deliveryResult;
        const intent = (0, intentDetector_1.detectIntent)(userMessage);
        const groupCommandPrefix = this.config.groupCommandPrefix;
        const prefixTriggeredInGroup = isgroup && userMessage.trim().startsWith(groupCommandPrefix);
        return this.route(intent, ctx, prefixTriggeredInGroup);
    }
    async route(intent, ctx, prefixTriggeredInGroup) {
        const { conversationSender, sender, resolvedName, userMessage, userWaIdentity, imageUrl, isgroup, } = ctx;
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
                return this.handleNutritionQuery(intent.productRef, intent.topic, userMessage);
            case 'cart_view':
                return this.handleCartView(conversationSender);
            case 'cart_add':
                return this.handleCartAdd(intent.productRef, intent.qty ?? 1, conversationSender);
            case 'cart_remove':
                return this.handleCartRemove(intent.productRef, conversationSender);
            case 'cart_clear':
                return this.handleCartClear(conversationSender);
            case 'checkout':
                return this.handleCheckout(intent.orderType, conversationSender, resolvedName, sender);
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
            case 'favorite_list':
            case 'favorite_add':
            case 'favorite_remove':
                return this.handleFavoritesUnsupported(intent.type);
            default:
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
    async handleMenu() {
        const products = await this.catalog.getAllProducts();
        return { reply: (0, menuFormatter_1.formatMenuList)(products), entryType: 'catalog' };
    }
    handleHelpQuick() {
        return { reply: (0, menuFormatter_1.formatHelpQuick)(), entryType: 'catalog' };
    }
    async handleProductDetail(productRef) {
        const product = await this.resolveProductRef(productRef);
        return { reply: (0, menuFormatter_1.formatProductDetail)(product), entryType: 'catalog' };
    }
    async handleIngredientsSingle(productRef) {
        const product = await this.resolveProductRef(productRef);
        return { reply: (0, ingredientFormatter_1.formatIngredientReply)(product), entryType: 'nutrition' };
    }
    async handleIngredientsAll(category) {
        const products = await this.catalog.getAllProducts();
        return {
            reply: (0, ingredientFormatter_1.formatAllIngredientsReply)(products, category),
            entryType: 'nutrition',
        };
    }
    async handleNutritionQuery(productRef, topic, userMessage) {
        let product = await this.resolveProductRef(productRef);
        if (!product) {
            const products = await this.catalog.getAllProducts();
            const lowered = userMessage.toLowerCase();
            product =
                products.find((p) => lowered.includes(p.name.toLowerCase())) ?? null;
        }
        if (!product) {
            const products = await this.catalog.getAllProducts();
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
            reply: this.nutrition.formatNutritionReply(product.name, topic),
            entryType: 'nutrition',
        };
    }
    async handleCartView(sender) {
        const c = await this.cart.getCart(sender);
        return {
            reply: this.cart.formatCartForMessage(c),
            entryType: 'cart',
            cartItems: c.items,
            totalPrice: c.total,
        };
    }
    async handleCartAdd(productRef, qty, sender) {
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
        }
        catch (err) {
            return { reply: err.message, entryType: 'cart' };
        }
    }
    async handleCartRemove(productRef, sender) {
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
    async handleCartClear(sender) {
        const c = await this.cart.clearCart(sender);
        return {
            reply: 'Keranjang berhasil dikosongkan.',
            entryType: 'cart',
            cartItems: c.items,
            totalPrice: c.total,
        };
    }
    async handleCheckout(orderType, conversationSender, resolvedName, sender) {
        if (orderType === 'delivery') {
            const c = await this.cart.getCart(conversationSender);
            if (!c.items.length)
                return {
                    reply: 'Keranjang masih kosong. Tambahkan item dulu sebelum checkout delivery.',
                    entryType: 'checkout',
                };
            deliverySessions.set(conversationSender, {
                awaitingDetails: true,
                createdAt: Date.now(),
            });
            return {
                reply: (0, menuFormatter_1.formatDeliveryRequestInstruction)(),
                entryType: 'checkout',
            };
        }
        return this.doCheckout({
            sender: conversationSender,
            customerName: resolvedName ?? sender,
            orderType,
        });
    }
    async handleDeliveryFollowup(conversationSender, sender, resolvedName, userMessage) {
        const session = deliverySessions.get(conversationSender);
        if (!session?.awaitingDetails)
            return null;
        if (Date.now() - session.createdAt > DELIVERY_TTL_MS) {
            deliverySessions.delete(conversationSender);
            return null;
        }
        const details = parseDeliveryDetails(userMessage);
        if (!details) {
            return {
                reply: [
                    'Format data delivery belum lengkap.',
                    (0, menuFormatter_1.formatDeliveryRequestInstruction)(),
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
    async doCheckout(opts) {
        try {
            const order = await this.checkout.createOrderFromCart(opts);
            return {
                reply: this.checkout.formatCheckoutSuccess(order),
                entryType: 'checkout',
                orderId: order.orderId,
                totalPrice: order.displayTotal,
                cartItems: order.items,
            };
        }
        catch (err) {
            return { reply: err.message, entryType: 'checkout' };
        }
    }
    async handleIngredientSummary() {
        const summary = await this.inventory.getIngredientSummaryByCategory();
        return {
            reply: (0, ingredientFormatter_1.formatIngredientInventorySummaryReply)(Array.isArray(summary) ? summary : []),
            entryType: 'inventory',
        };
    }
    async handleIngredientAllStock() {
        const [globalStats, items] = await Promise.all([
            this.inventory.getIngredientGlobalStats(),
            this.inventory.getAllIngredientStocks(300),
        ]);
        return {
            reply: (0, ingredientFormatter_1.formatAllIngredientStocksReply)(items, globalStats),
            entryType: 'inventory',
        };
    }
    async handleIngredientByCategory(category) {
        const items = await this.inventory.getIngredientsByCategory(category, 25);
        return {
            reply: (0, ingredientFormatter_1.formatIngredientCategoryReply)(category, items),
            entryType: 'inventory',
        };
    }
    async handleIngredientSingleStock(ingredientRef) {
        const cleanedRef = (0, ingredientIntent_1.normalizeIngredientReference)(ingredientRef);
        const item = await this.inventory.searchIngredientByName(cleanedRef || ingredientRef);
        if (item)
            return {
                reply: (0, ingredientFormatter_1.formatSingleIngredientStockReply)(item),
                entryType: 'inventory',
            };
        const product = await this.resolveProductRef(cleanedRef || ingredientRef);
        return {
            reply: product
                ? (0, menuFormatter_1.formatProductDetail)(product)
                : 'Bahan atau produk tidak ditemukan. Coba: stok beras ada berapa, stok bahan minuman, atau menu.',
            entryType: 'inventory',
        };
    }
    async handleIngredientOutSummary() {
        const [globalStats, outItems] = await Promise.all([
            this.inventory.getIngredientGlobalStats(),
            this.inventory.getOutOfStockIngredients(200),
        ]);
        return {
            reply: (0, ingredientFormatter_1.formatOutOfStockSummaryReply)(globalStats, outItems),
            entryType: 'inventory',
        };
    }
    async handleIngredientLowStock() {
        const items = await this.inventory.getLowStockIngredients(20);
        return {
            reply: (0, ingredientFormatter_1.formatLowStockIngredientsReply)(items),
            entryType: 'inventory',
        };
    }
    async handleIngredientPopIce() {
        const items = await this.inventory.getPopIceAvailability();
        return {
            reply: (0, ingredientFormatter_1.formatPopIceAvailabilityReply)(items),
            entryType: 'inventory',
        };
    }
    async handleReportToday() {
        const today = new Date().toISOString().slice(0, 10);
        const sales = await this.reports.getSalesForDate(today);
        return {
            reply: (0, reportFormatter_1.formatReportReply)('Laporan penjualan hari ini', sales),
            entryType: 'report',
        };
    }
    async handleReportYear(year) {
        if (!this.isValidYear(year))
            return {
                reply: 'Format tahun tidak valid. Contoh: total penghasilan tahun 2025',
                entryType: 'report',
            };
        const sales = await this.reports.getSalesForYear(year);
        return {
            reply: (0, reportFormatter_1.formatReportReply)(`Laporan penjualan tahun ${year}`, sales),
            entryType: 'report',
        };
    }
    async handleReportYearDetail(year) {
        if (!this.isValidYear(year))
            return { reply: 'Format tahun tidak valid.', entryType: 'report' };
        const { yearSales, monthlyBreakdown, topProducts } = await this.reports.getYearDetailBundle(year);
        return {
            reply: (0, reportFormatter_1.formatYearDetailReport)(year, yearSales, monthlyBreakdown, topProducts),
            entryType: 'report',
        };
    }
    async handleReportMonth(year, month) {
        if (!this.isValidYear(year) || !this.isValidMonth(month)) {
            return {
                reply: 'Format bulan/tahun tidak valid. Contoh: laporan penjualan Maret 2025',
                entryType: 'report',
            };
        }
        const { monthSales, topProducts } = await this.reports.getMonthDetailBundle(year, month);
        return {
            reply: (0, reportFormatter_1.formatMonthReportReply)(year, month, monthSales, topProducts),
            entryType: 'report',
        };
    }
    async handleReportBestMonth(year) {
        if (!this.isValidYear(year))
            return { reply: 'Format tahun tidak valid.', entryType: 'report' };
        const monthlyBreakdown = await this.reports.getSalesMonthlyBreakdown(year);
        return {
            reply: (0, reportFormatter_1.formatBestMonthReply)(year, monthlyBreakdown),
            entryType: 'report',
        };
    }
    async handleReportSummary() {
        const sales = await this.reports.getSalesSummary();
        return {
            reply: (0, reportFormatter_1.formatReportReply)('Ringkasan seluruh penjualan sukses', sales),
            entryType: 'report',
        };
    }
    async handleAiFallback(opts) {
        const { userMessage, conversationSender, userWaIdentity, isgroup, prefixTriggeredInGroup, } = opts;
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
            this.catalog.getCatalogContext(),
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
    handleFavoritesUnsupported(intentType) {
        const messages = {
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
    async resolveProductRef(productRef) {
        const maybeId = Number(productRef);
        if (Number.isInteger(maybeId) && maybeId > 0)
            return this.catalog.getProductById(maybeId);
        return this.catalog.findProductByName(String(productRef));
    }
    isValidYear(year) {
        return Number.isInteger(year) && year >= 2000 && year <= 2100;
    }
    isValidMonth(month) {
        return Number.isInteger(month) && month >= 1 && month <= 12;
    }
};
exports.BotDispatchService = BotDispatchService;
exports.BotDispatchService = BotDispatchService = BotDispatchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [catalog_service_1.CatalogService,
        inventory_service_1.InventoryService,
        cart_service_1.CartService,
        checkout_service_1.CheckoutService,
        history_service_1.HistoryService,
        llm_service_1.LlmService,
        reports_service_1.ReportsService,
        nutrition_advisor_service_1.NutritionAdvisorService,
        app_config_service_1.AppConfigService])
], BotDispatchService);
//# sourceMappingURL=bot-dispatch.service.js.map