"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferIngredients = inferIngredients;
exports.formatIngredientReply = formatIngredientReply;
exports.formatAllIngredientsReply = formatAllIngredientsReply;
exports.formatIngredientInventorySummaryReply = formatIngredientInventorySummaryReply;
exports.formatAllIngredientStocksReply = formatAllIngredientStocksReply;
exports.formatIngredientCategoryReply = formatIngredientCategoryReply;
exports.formatSingleIngredientStockReply = formatSingleIngredientStockReply;
exports.formatLowStockIngredientsReply = formatLowStockIngredientsReply;
exports.formatOutOfStockSummaryReply = formatOutOfStockSummaryReply;
exports.formatPopIceAvailabilityReply = formatPopIceAvailabilityReply;
const INGREDIENT_RULES = [
    {
        pattern: /nasi\s+campur\s+ikan|ikan/i,
        ingredients: ["nasi", "ikan", "bumbu rempah", "sayur pelengkap", "sambal"],
    },
    {
        pattern: /nasi\s+ayam\s+kampung|ayam\s+kampung/i,
        ingredients: ["nasi", "ayam kampung", "bumbu ungkep", "bawang", "sambal"],
    },
    {
        pattern: /nasi\s+goreng/i,
        ingredients: ["nasi", "bawang", "kecap", "telur", "bumbu nasi goreng"],
    },
    {
        pattern: /mie\s+goreng/i,
        ingredients: ["mie", "bawang", "kecap", "sayuran", "bumbu mie goreng"],
    },
    {
        pattern: /tempe\s+penyet|tempe/i,
        ingredients: ["nasi", "tempe", "sambal penyet", "lalapan", "minyak goreng"],
    },
    {
        pattern: /ayam\s+geprek|geprek/i,
        ingredients: ["nasi", "ayam", "tepung", "sambal geprek", "minyak goreng"],
    },
    {
        pattern: /nutrisari/i,
        ingredients: ["bubuk nutrisari", "air", "gula", "es batu (opsional)"],
    },
    {
        pattern: /chocolatos|cholocatos/i,
        ingredients: [
            "bubuk chocolatos",
            "air atau susu",
            "gula (opsional)",
            "es batu (opsional)",
        ],
    },
    {
        pattern: /beng\s*beng\s*drink/i,
        ingredients: [
            "bubuk beng beng drink",
            "air atau susu",
            "gula (opsional)",
            "es batu (opsional)",
        ],
    },
    {
        pattern: /pop\s*ice/i,
        ingredients: [
            "bubuk pop ice",
            "air",
            "es batu",
            "susu kental manis (opsional)",
        ],
    },
    {
        pattern: /saraba/i,
        ingredients: ["jahe", "susu atau air", "gula aren", "rempah"],
    },
    {
        pattern: /milo/i,
        ingredients: [
            "bubuk milo",
            "air atau susu",
            "gula (opsional)",
            "es batu (opsional)",
        ],
    },
    {
        pattern: /pisang\s+goreng/i,
        ingredients: ["pisang", "tepung", "gula", "garam", "minyak goreng"],
    },
    {
        pattern: /roti\s+bakar/i,
        ingredients: [
            "roti",
            "margarin",
            "coklat atau keju atau ovaltine",
            "susu kental manis (opsional)",
        ],
    },
    {
        pattern: /kentang\s+goreng/i,
        ingredients: ["kentang", "garam", "minyak goreng", "saus (opsional)"],
    },
    {
        pattern: /pie\s+coklat/i,
        ingredients: ["kulit pie", "isian coklat", "gula", "margarin"],
    },
    {
        pattern: /ubi\s+goreng/i,
        ingredients: ["ubi", "tepung tipis (opsional)", "garam", "minyak goreng"],
    },
];
function inferIngredients(product) {
    const combined = `${product.name ?? ""} ${product.description ?? ""}`.toLowerCase();
    const set = new Set();
    INGREDIENT_RULES.forEach((rule) => {
        if (rule.pattern.test(combined))
            rule.ingredients.forEach((i) => set.add(i));
    });
    if (/hot\/cold|hot|cold/.test(product.description ?? ""))
        set.add("air panas/dingin sesuai varian");
    if (/all\s*var/.test(product.description ?? ""))
        set.add("varian rasa sesuai pilihan");
    if (!set.size) {
        if (product.category === "Minuman")
            ["air", "gula", "es batu (opsional)", "bahan utama minuman"].forEach((i) => set.add(i));
        else if (product.category === "Snack")
            ["bahan utama snack", "tepung", "gula/garam", "minyak goreng"].forEach((i) => set.add(i));
        else
            [
                "karbohidrat utama",
                "protein/bahan utama",
                "bumbu",
                "pelengkap",
            ].forEach((i) => set.add(i));
    }
    return [...set];
}
function formatIngredientReply(product) {
    if (!product)
        return "Menu tidak ditemukan. Coba tulis: komposisi nasi goreng atau komposisi semua menu.";
    const ingredients = inferIngredients(product);
    return [
        `🧾 Komposisi ${product.name}`,
        ...ingredients.map((i) => `- ${i}`),
        "",
        "Catatan: Komposisi ini adalah estimasi berbasis nama/deskripsi menu.",
    ].join("\n");
}
function formatAllIngredientsReply(products, categoryFilter = null) {
    const scoped = categoryFilter
        ? products.filter((p) => p.category === categoryFilter)
        : products;
    if (!scoped.length)
        return "Belum ada data menu untuk komposisi yang diminta.";
    const order = ["Makanan", "Minuman", "Snack"];
    const grouped = order
        .map((cat) => ({ cat, items: scoped.filter((p) => p.category === cat) }))
        .filter((g) => g.items.length);
    const lines = [
        categoryFilter
            ? `🧾 Komposisi menu kategori ${categoryFilter}`
            : "🧾 Komposisi semua menu",
    ];
    grouped.forEach(({ cat, items }) => {
        lines.push("", `${cat}:`);
        items.forEach((p, i) => lines.push(`${i + 1}. ${p.name}: ${inferIngredients(p).join(", ")}`));
    });
    lines.push("", "Catatan: Komposisi bersifat estimasi dari data menu yang tersedia.");
    return lines.join("\n");
}
function formatIngredientInventorySummaryReply(summary) {
    if (!summary.length)
        return "Data bahan pokok belum tersedia.";
    return [
        "📦 Ringkasan bahan pokok:",
        ...summary.map((item) => `- ${item.category}: ${item.totalProducts} produk | stok total ${item.totalStock} | menipis ${item.totalLowStock} | habis ${item.totalOutOfStock}`),
        "",
        "Contoh tanya lanjutan:",
        "- semua stok bahan",
        "- stok bahan minuman",
        "- stok beras ada berapa",
    ].join("\n");
}
function formatAllIngredientStocksReply(items, globalStats) {
    if (!items.length)
        return "Data stok semua bahan belum tersedia.";
    const lines = ["📚 Daftar semua stok bahan pokok:"];
    if (globalStats)
        lines.push(`Ringkasan: total produk ${globalStats.totalProducts} | total stok ${globalStats.totalStock}`);
    items.forEach((item, i) => lines.push(`${i + 1}. [${item.category ?? "-"}] ${item.name} - ${item.stock} ${item.unit ?? ""}`));
    return lines.join("\n");
}
function formatIngredientCategoryReply(category, items) {
    if (!items.length)
        return `Belum ada data bahan kategori ${category}.`;
    return [
        `📋 Stok bahan kategori ${category.toLowerCase()}:`,
        ...items.map((item, i) => `${i + 1}. ${item.name} - stok ${item.stock} ${item.unit ?? ""}`),
    ].join("\n");
}
function formatSingleIngredientStockReply(item) {
    if (!item)
        return "Bahan tidak ditemukan. Coba ketik nama bahan yang lebih spesifik.";
    return [
        `📌 Stok bahan: ${item.name}`,
        `- Stok saat ini: ${item.stock} ${item.unit ?? ""}`,
        `- Status: ${item.status ?? "-"}`,
    ].join("\n");
}
function formatLowStockIngredientsReply(items) {
    if (!items.length)
        return "✅ Tidak ada bahan menipis. Semua stok bahan masih aman.";
    return [
        "⚠️ Bahan menipis/habis:",
        ...items.map((item, i) => `${i + 1}. ${item.name} (${item.category ?? "-"}) - ${item.stock} ${item.unit ?? ""}`),
    ].join("\n");
}
function formatOutOfStockSummaryReply(globalStats, items) {
    const outCount = Number(globalStats?.totalOutOfStock ?? 0);
    if (!outCount)
        return [
            "✅ Saat ini tidak ada bahan yang habis total.",
            `Bahan menipis: ${Number(globalStats?.totalLowStock ?? 0)} item.`,
        ].join("\n");
    const lines = [`⚠️ Bahan habis: ${outCount} item.`];
    if (items.length) {
        lines.push("", "Daftar bahan habis:");
        items.forEach((item, i) => lines.push(`${i + 1}. ${item.name} - ${item.stock}`));
    }
    return lines.join("\n");
}
function formatPopIceAvailabilityReply(items) {
    if (!items.length)
        return "Data varian Pop Ice belum tersedia di database bahan.";
    return [
        "🥤 Ketersediaan varian Pop Ice:",
        ...items.map((item, i) => `${i + 1}. ${item.flavor ?? item.name} - ${item.stock}`),
    ].join("\n");
}
//# sourceMappingURL=ingredientFormatter.js.map