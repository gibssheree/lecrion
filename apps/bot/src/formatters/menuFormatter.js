"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMenuList = formatMenuList;
exports.formatFavoritesList = formatFavoritesList;
exports.formatProductDetail = formatProductDetail;
exports.formatDeliveryRequestInstruction = formatDeliveryRequestInstruction;
exports.formatHelpQuick = formatHelpQuick;
function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}
function formatMenuList(products) {
    if (!products.length)
        return "Saat ini belum ada produk tersedia.";
    const groups = {
        Makanan: [],
        Minuman: [],
        Snack: [],
        Lainnya: [],
    };
    products.forEach((p) => {
        const cat = p.category ?? "Lainnya";
        (groups[cat] ?? groups["Lainnya"]).push(p);
    });
    let seq = 1;
    const lines = [];
    const sections = [
        { key: "Makanan", label: "🍽️ Makanan" },
        { key: "Minuman", label: "🥤 Minuman" },
        { key: "Snack", label: "🍟 Snack" },
        { key: "Lainnya", label: "📦 Lainnya" },
    ];
    sections.forEach(({ key, label }) => {
        const items = groups[key];
        if (!items?.length)
            return;
        lines.push(label);
        items.forEach((p) => {
            lines.push(`${seq}. ${p.name} - Rp${formatRupiah(p.price)} (stok ${p.stock}) [ID ${p.id}]`);
            seq++;
        });
        lines.push("");
    });
    return [
        "Menu kantin saat ini:",
        ...lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")),
        "",
        "Perintah cepat:",
        "- tambah <qty> <nama produk>",
        "- keranjang",
        "- checkout",
        "- checkout delivery",
    ].join("\n");
}
function formatFavoritesList(items = []) {
    if (!items.length)
        return "Kamu belum punya menu favorit. Kirim: tambahkan <nama menu> sebagai favorit saya";
    return [
        "⭐ Daftar favorit kamu:",
        ...items.map((item, i) => `${i + 1}. ${item.name} - Rp${formatRupiah(item.price)} (stok ${item.stock}) [ID ${item.id}]`),
    ].join("\n");
}
function formatProductDetail(product) {
    if (!product)
        return "Produk tidak ditemukan. Ketik menu untuk lihat daftar produk.";
    return [
        `Detail produk #${product.id}`,
        `Nama: ${product.name}`,
        `Harga: Rp${formatRupiah(product.price)}`,
        `Stok: ${product.stock}`,
        `Deskripsi: ${product.description ?? "-"}`,
    ].join("\n");
}
function formatDeliveryRequestInstruction() {
    return [
        "Untuk checkout delivery, kirim data ini dulu:",
        "nama: <nama kamu>",
        "phone: <nomor hp>",
        "alamat: <alamat lengkap>",
        "",
        "Atau format cepat: Nama | NoHP | Alamat",
    ].join("\n");
}
function formatHelpQuick() {
    return [
        "Halo 👋, aku asisten Lecrion untuk toko yang terhubung ke POS.",
        "Mode owner/admin:",
        "- stok barang hari ini",
        "- penjualan hari ini / tahun ini",
        "- produk terlaris bulan ini",
        "",
        "Mode customer:",
        "- produk apa yang tersedia",
        "- harga <nama barang>",
        "- stok <nama barang>",
        "- detail <nama barang>",
        "",
        "Jika POS provider belum terhubung, bot akan pakai data internal sebagai fallback.",
    ].join("\n");
}
//# sourceMappingURL=menuFormatter.js.map