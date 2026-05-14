"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectIntent = detectIntent;
exports.sanitizeMessageForIntent = sanitizeMessageForIntent;
const ingredientIntent_1 = require("./ingredientIntent");
const reportIntent_1 = require("./reportIntent");
function sanitizeMessageForIntent(rawMessage = "") {
    let text = String(rawMessage ?? "").trim();
    text = text.replace(/^@[\w.-]+\s+/i, "").trim();
    text = text.replace(/^lecrion\s*[:,-]?\s*/i, "").trim();
    return text;
}
function detectNutritionTopic(text) {
    const norm = text.toLowerCase();
    if (norm.includes("kalori"))
        return "kalori";
    if (norm.includes("gula") || norm.includes("manis"))
        return "gula";
    if (norm.includes("protein"))
        return "protein";
    if (norm.includes("lemak") || norm.includes("kolesterol"))
        return "lemak";
    if (norm.includes("alergi") ||
        norm.includes("kacang") ||
        norm.includes("susu") ||
        norm.includes("gluten"))
        return "alergi";
    if (norm.includes("nutrisi") ||
        norm.includes("gizi") ||
        norm.includes("sehat") ||
        norm.includes("diet"))
        return "nutrisi umum";
    return null;
}
function detectNutritionIntent(text, normalized) {
    const topic = detectNutritionTopic(normalized);
    if (!topic)
        return null;
    const patterns = [
        /^(?:info|informasi|kandungan)?\s*(?:gizi|nutrisi|kalori|energi|protein|karbo(?:hidrat)?|lemak|gula|serat|vitamin|mineral)\s+(?:untuk|pada|di|dari)?\s*(.+)$/i,
        /^(?:berapa\s+)?(?:kalori|energi|protein|karbo(?:hidrat)?|lemak|gula|serat|vitamin|mineral)\s+(?:di|pada|untuk|dari)\s+(.+)$/i,
        /^(.+?)\s+(?:mengandung|punya)\s+(?:apa|berapa)?\s*(?:kandungan\s+)?(?:gizi|nutrisi|kalori|energi|protein|karbo(?:hidrat)?|lemak|gula|serat|vitamin|mineral)/i,
    ];
    let productRef = "";
    for (const p of patterns) {
        const m = text.match(p);
        if (m?.[1]) {
            productRef = String(m[1]).trim();
            break;
        }
    }
    if (!productRef) {
        productRef = text
            .replace(/\b(kandungan|gizi|nutrisi|kalori|energi|protein|karbohidrat|karbo|lemak|gula|serat|vitamin|mineral|untuk|pada|di|dari|berapa|apa|menu|makanan|minuman)\b/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
    }
    return { type: "nutrition_query", topic, productRef };
}
function detectIntent(userMessage) {
    const text = sanitizeMessageForIntent(userMessage);
    const normalized = text.toLowerCase().replace(/^\/+/, "").trim();
    const ingredientInventory = (0, ingredientIntent_1.detectIngredientInventoryIntent)(text, normalized);
    if (ingredientInventory)
        return ingredientInventory;
    const report = (0, reportIntent_1.detectReportIntent)(normalized);
    if (report)
        return report;
    const nutrition = detectNutritionIntent(text, normalized);
    if (nutrition)
        return nutrition;
    const ingredient = (0, ingredientIntent_1.detectIngredientIntent)(text, normalized);
    if (ingredient)
        return ingredient;
    if ([
        "favorit saya",
        "favorite saya",
        "daftar favorit",
        "list favorit",
        "apa menu favorit saya",
    ].includes(normalized)) {
        return { type: "favorite_list" };
    }
    const favRemove = normalized.match(/^(hapus|remove)\s+(?:menu\s+)?(?:favorit|favorite)\s+(.+)$/i);
    if (favRemove)
        return { type: "favorite_remove", productRef: favRemove[2].trim() };
    const favAddNatural = text.match(/^tambah(?:kan)?\s+(.+?)\s+(?:sebagai\s+)?(?:menu\s+)?favorit(?:\s+saya)?$/i);
    if (favAddNatural)
        return { type: "favorite_add", productRef: favAddNatural[1].trim() };
    const favAddShort = normalized.match(/^(favorit(?:kan)?|favorite(?:kan)?)\s+(.+)$/i);
    if (favAddShort)
        return { type: "favorite_add", productRef: favAddShort[2].trim() };
    if (/favorit/i.test(text)) {
        const favByPossession = text.match(/^(?:halo\s+)?tambah(?:kan)?\s+(?:favorit\s+saya\s+)?(.+)$/i);
        if (favByPossession) {
            return {
                type: "favorite_add",
                productRef: favByPossession[1]
                    .replace(/^(favorit\s+saya\s+)/i, "")
                    .replace(/\s+(ke\s+)?favorit(\s+saya)?$/i, "")
                    .trim(),
            };
        }
    }
    if (["halo", "hallo", "haloo", "hai", "hi", "p", "help", "bantuan"].includes(normalized))
        return { type: "help_quick" };
    if ((normalized.includes("menu") ||
        normalized.includes("katalog") ||
        normalized.includes("produk")) &&
        !normalized.includes("favorit") &&
        !normalized.includes("favorite"))
        return { type: "menu" };
    if (["menu", "produk", "list", "daftar", "katalog"].includes(normalized))
        return { type: "menu" };
    if (["keranjang", "cart"].includes(normalized))
        return { type: "cart_view" };
    if (["checkout", "check out"].includes(normalized))
        return { type: "checkout", orderType: "pickup" };
    if (["checkout delivery", "checkout antar", "checkout diantar"].includes(normalized))
        return { type: "checkout", orderType: "delivery" };
    if (["clear cart", "kosongkan keranjang", "batal"].includes(normalized))
        return { type: "cart_clear" };
    const addMatch = normalized.match(/^tambah\s+(\d+)\s+(.+)$/i);
    if (addMatch)
        return {
            type: "cart_add",
            qty: Number(addMatch[1]),
            productRef: addMatch[2].trim(),
        };
    const addSingle = normalized.match(/^tambah\s+(.+)$/i);
    if (addSingle)
        return { type: "cart_add", qty: 1, productRef: addSingle[1].trim() };
    const removeMatch = normalized.match(/^hapus\s+(.+)$/i);
    if (removeMatch)
        return { type: "cart_remove", productRef: removeMatch[1].trim() };
    const detailMatch = normalized.match(/^(detail|stok|harga)\s+(.+)$/i);
    if (detailMatch)
        return { type: "product_detail", productRef: detailMatch[2].trim() };
    return { type: "ai_fallback" };
}
//# sourceMappingURL=intentDetector.js.map