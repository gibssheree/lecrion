"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalizeCategory = capitalizeCategory;
exports.normalizeIngredientReference = normalizeIngredientReference;
exports.detectIngredientInventoryIntent = detectIngredientInventoryIntent;
exports.detectIngredientIntent = detectIngredientIntent;
function capitalizeCategory(value = "") {
    const l = String(value ?? "").toLowerCase();
    if (l === "snack")
        return "Snack";
    if (l === "makanan")
        return "Makanan";
    if (l === "minuman")
        return "Minuman";
    return value;
}
function normalizeIngredientReference(rawText = "") {
    return String(rawText ?? "")
        .toLowerCase()
        .replace(/\b(stok|bahan|cek|ada|berapa|jumlah|dong|ya|nih|please|tolong)\b/gi, " ")
        .replace(/\b(yang\s+ada|saat\s+ini|sekarang)\b/gi, " ")
        .replace(/[^a-z0-9/\-\s()]/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function detectIngredientInventoryIntent(text, normalized) {
    const hasBahan = /(bahan\s+pokok|stok\s+bahan|inventori\s+bahan|inventory\s+bahan|bahan\s+stok)/i.test(normalized);
    const asksLow = /(bahan\s+menipis|stok\s+menipis|stok\s+habis|bahan\s+habis|stok\s+kritis)/i.test(normalized);
    const asksPopIce = /(pop\s*ice).*(rasa|tersedia|stok)|rasa\s+pop\s*ice|pop\s*ice\s+tersedia/i.test(normalized);
    const asksAll = /(apa\s+aja|apa\s+saja|semua|seluruh|list|daftar).*(bahan|stok)|bahan\s+pokok\s+yang\s+ada/i.test(normalized);
    const asksOut = /(sudah\s+habis\s+berapa|berapa\s+yang\s+habis|jumlah\s+bahan\s+habis|habis\s+berapa)/i.test(normalized);
    if (asksPopIce)
        return { type: "ingredient_pop_ice" };
    if (asksOut)
        return { type: "ingredient_out_summary" };
    if (asksAll)
        return { type: "ingredient_all_stock" };
    if (asksLow)
        return { type: "ingredient_low_stock" };
    const catMatch = normalized.match(/\b(makanan|minuman|snack|snacks)\b/i);
    const category = catMatch ? catMatch[1].toLowerCase() : "";
    if (hasBahan && category)
        return { type: "ingredient_by_category", category };
    const singleMatch = text.match(/^(?:stok\s+bahan|cek\s+bahan|stok)\s+(.+)$/i);
    if (singleMatch?.[1]) {
        const ref = singleMatch[1].trim();
        if (ref && !/(makanan|minuman|snack|snacks)$/i.test(ref)) {
            return { type: "ingredient_single_stock", ingredientRef: ref };
        }
    }
    if (hasBahan)
        return { type: "ingredient_summary" };
    return null;
}
function detectIngredientIntent(text, normalized) {
    if (!/(komposisi|ingredient|ingredients|bahan)/i.test(normalized))
        return null;
    const catMatch = normalized.match(/\b(makanan|minuman|snack|snacks)\b/i);
    const categoryFilter = catMatch
        ? catMatch[1].toLowerCase() === "snacks"
            ? "Snack"
            : capitalizeCategory(catMatch[1])
        : null;
    const asksAll = /(semua|seluruh|all|daftar)/i.test(normalized);
    if (asksAll ||
        /(menu\s+apa\s+saja\s+beserta\s+komposisi)/i.test(normalized)) {
        return { type: "ingredients_all", category: categoryFilter };
    }
    const patterns = [
        /^(?:komposisi|ingredients?|bahan)\s+(?:untuk|dari|menu)?\s*(.+)$/i,
        /^(.+?)\s+(?:komposisinya|ingredients?|bahannya)$/i,
        /(?:komposisi|ingredients?|bahan)\s+(.+)$/i,
    ];
    let productRef = "";
    for (const p of patterns) {
        const m = text.match(p);
        if (m?.[1]) {
            productRef = String(m[1]).trim();
            break;
        }
    }
    if (!productRef || /^(semua|seluruh|all|menu)$/i.test(productRef)) {
        return { type: "ingredients_all", category: categoryFilter };
    }
    return { type: "ingredients_single", productRef };
}
//# sourceMappingURL=ingredientIntent.js.map