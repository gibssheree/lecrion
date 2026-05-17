# Gap Analysis: Lecrion vs Majoo

> Dibuat: 2026-05-16  
> Tujuan: Peta fitur yang perlu dibangun agar Lecrion setara dengan POS enterprise seperti Majoo, Mekari, dan majoo.

---

## 1. Struktur Navigasi

### Majoo — Navigasi Hierarkis

```
Penjualan
  ├── Transaksi POS
  ├── Order Online
  ├── Appointment
  └── Invoice

Produk
  ├── Daftar Produk
  ├── Kategori Produk
  ├── Bahan Baku
  ├── Resep
  ├── Bundling
  └── Harga Khusus

Inventori
  ├── Stok Barang
  ├── Mutasi Stok
  ├── Opname Stok
  ├── Purchase Order
  └── Penerimaan Barang

Karyawan
  ├── Daftar Karyawan
  ├── Shift & Jadwal
  ├── Komisi
  └── Absensi

Keuangan
  ├── Laporan Keuangan
  ├── Biaya Operasional
  ├── Hutang/Piutang
  └── Rekonsiliasi

Laporan
  ├── Penjualan
  ├── Produk
  ├── Pelanggan
  ├── Karyawan
  └── Keuangan

Pelanggan
  ├── Daftar Pelanggan
  ├── Loyalty Program
  └── Segmentasi

Promosi
  ├── Diskon
  ├── Voucher
  └── Bundle
```

### Lecrion — Navigasi Saat Ini

```
POS Web (apps/pos-web):
  Dashboard · Kasir · Pesanan · Inventori · Cashflow · Laporan · Pengaturan · KDS

Dashboard Admin (apps/dashboard):
  Bot Overview · Chat · Live Feed · Orders · Inventory · Cashflow
  Analytics · LLM Console · Settings · Customers · F&B · Users
```

---

## 2. Gap Per Domain

### 🛍️ Produk & Katalog

| Fitur                      | Majoo | Lecrion   | Gap                                                   |
| -------------------------- | ----- | --------- | ----------------------------------------------------- |
| Daftar produk + CRUD       | ✅    | ✅ basic  | Tidak ada form create/edit produk di UI               |
| Kategori produk            | ✅    | ✅ DB+API | **Tidak ada halaman manajemen kategori di dashboard** |
| Bahan baku / raw material  | ✅    | ❌        | Tidak ada tabel bahan baku terpisah                   |
| Resep (recipe)             | ✅    | ❌        | Tidak ada                                             |
| Bundling produk            | ✅    | ❌        | DB `product_bundles` belum ada                        |
| Harga khusus / price tier  | ✅    | ❌        | Tidak ada                                             |
| Varian produk (size/color) | ✅    | ✅ DB     | **Tidak ada UI untuk manage variants**                |
| Barcode management         | ✅    | ✅ DB     | **Tidak ada UI untuk manage barcodes**                |
| Import/Export produk (CSV) | ✅    | ❌        | Tidak ada                                             |
| Foto produk upload         | ✅    | ❌        | Hanya input URL, tidak ada file upload                |
| SKU management             | ✅    | ✅ DB     | Tidak ada UI khusus                                   |
| Unit satuan                | ✅    | ✅ DB     | Tidak ada tabel `product_units`                       |

### 📦 Inventori

| Fitur                         | Majoo | Lecrion                | Gap                                                      |
| ----------------------------- | ----- | ---------------------- | -------------------------------------------------------- |
| Stok barang per lokasi        | ✅    | ✅                     | UI sangat basic                                          |
| Mutasi stok (history)         | ✅    | ✅                     | Ada endpoint, tidak ada halaman dedicated                |
| Opname stok                   | ✅    | ❌                     | Tidak ada endpoint maupun UI                             |
| Purchase Order                | ✅    | ✅ operation_documents | **Tidak ada UI di dashboard**                            |
| Penerimaan barang (GR)        | ✅    | ✅ operation_documents | **Tidak ada UI di dashboard**                            |
| Stock transfer antar lokasi   | ✅    | ✅ operation_documents | **Tidak ada UI di dashboard**                            |
| Supplier management           | ✅    | ❌                     | Tidak ada tabel suppliers — hanya string `supplier_name` |
| Minimum stok alert per produk | ✅    | ✅ basic               | Hanya threshold global, tidak per produk                 |
| Batch/lot tracking            | ✅    | ❌                     | Tidak ada                                                |
| Import stok (CSV)             | ✅    | ❌                     | Tidak ada                                                |

### 👥 Karyawan / User Management

| Fitur              | Majoo | Lecrion        | Gap                                         |
| ------------------ | ----- | -------------- | ------------------------------------------- |
| Daftar karyawan    | ✅    | ✅ users table | **Tidak ada halaman `/users` di dashboard** |
| Role management    | ✅    | ✅             | Ada API, tidak ada UI                       |
| Shift & jadwal     | ✅    | ❌             | Tidak ada                                   |
| Komisi penjualan   | ✅    | ❌             | Tidak ada                                   |
| Absensi            | ✅    | ❌             | Tidak ada                                   |
| PIN kasir per user | ✅    | ✅ manager PIN | Hanya untuk approval, bukan login kasir     |

### 💰 Keuangan

| Fitur                 | Majoo | Lecrion             | Gap                                        |
| --------------------- | ----- | ------------------- | ------------------------------------------ |
| Laporan laba rugi     | ✅    | ❌                  | Butuh HPP/cost price dulu                  |
| Biaya operasional     | ✅    | ✅ cashflow expense | Tidak ada kategori biaya                   |
| Hutang/piutang        | ✅    | ❌                  | Tidak ada                                  |
| Rekonsiliasi bank     | ✅    | ❌                  | Tidak ada                                  |
| HPP / cost price      | ✅    | ❌                  | **Tidak ada kolom `cost_price` di produk** |
| Gross margin report   | ✅    | ❌                  | Butuh HPP dulu                             |
| Multi-outlet keuangan | ✅    | ❌                  | Single store saja                          |

### 📊 Laporan

| Fitur                  | Majoo | Lecrion            | Gap                                            |
| ---------------------- | ----- | ------------------ | ---------------------------------------------- |
| Laporan penjualan      | ✅    | ✅                 | UI masih text-based                            |
| Laporan produk         | ✅    | ✅ top products    | Basic                                          |
| Laporan kasir          | ✅    | ✅                 | Ada                                            |
| Laporan pelanggan      | ✅    | ✅ customer repeat | Basic                                          |
| Laporan keuangan (P&L) | ✅    | ❌                 | Tidak ada                                      |
| Export PDF/Excel       | ✅    | ❌                 | Tidak ada                                      |
| Chart/grafik visual    | ✅    | ✅ hourly bar      | Sangat minimal — hanya bar chart dari div HTML |
| Perbandingan periode   | ✅    | ❌                 | Tidak ada                                      |
| Laporan shift          | ✅    | ✅                 | Ada                                            |

### 🎯 Promosi & Marketing

| Fitur                | Majoo | Lecrion | Gap                                           |
| -------------------- | ----- | ------- | --------------------------------------------- |
| Diskon produk        | ✅    | ✅      | Ada                                           |
| Voucher              | ✅    | ✅      | Ada                                           |
| Bundle pricing       | ✅    | ❌      | Tidak ada                                     |
| Buy X Get Y          | ✅    | ❌      | DB ada `promo_type` tapi tidak diimplementasi |
| Happy hour           | ✅    | ❌      | Tidak ada                                     |
| Loyalty program      | ✅    | ✅      | Ada                                           |
| Segmentasi pelanggan | ✅    | ❌      | Tidak ada                                     |
| Push notification    | ✅    | ❌      | Tidak ada                                     |
| Marketing campaign   | ✅    | ❌      | Tidak ada                                     |

### 🖥️ POS Cashier Experience

| Fitur                                  | Majoo | Lecrion          | Gap                                            |
| -------------------------------------- | ----- | ---------------- | ---------------------------------------------- |
| Tampilan produk grid                   | ✅    | ✅               | Ada                                            |
| Search + barcode                       | ✅    | ✅               | Ada                                            |
| Split payment                          | ✅    | ✅               | Ada                                            |
| Hold order                             | ✅    | ❌               | Tidak ada                                      |
| Multiple cart                          | ✅    | ❌               | Tidak ada                                      |
| Table selection (F&B)                  | ✅    | ✅ KDS           | Ada tapi tidak terintegrasi di POS cashier     |
| Customer display (second screen)       | ✅    | ❌               | Tidak ada                                      |
| Receipt printer (thermal)              | ✅    | ✅ browser print | Ada tapi tidak ada thermal printer integration |
| Cash drawer trigger                    | ✅    | ❌               | Tidak ada                                      |
| Barcode scanner                        | ✅    | ✅               | Ada                                            |
| Offline mode                           | ✅    | ✅               | Ada (Phase 8)                                  |
| Keyboard shortcuts                     | ✅    | ✅ F1/F2/F4      | Partial                                        |
| Template struk custom                  | ✅    | ❌               | Tidak ada                                      |
| Order type (dine-in/takeaway/delivery) | ✅    | ✅               | Ada                                            |

---

## 3. Masalah Struktural Utama

### A. Tidak ada form CRUD produk di UI

Lecrion tidak punya halaman untuk **tambah/edit/hapus produk** di dashboard maupun POS web. Hanya bisa edit stok. Ini gap paling mendasar — owner tidak bisa manage katalog tanpa akses langsung ke database.

### B. Halaman yang ada di routing tapi belum dibuat

| Route                                | Status                                    |
| ------------------------------------ | ----------------------------------------- |
| `/users`                             | Ada di `routePaths.ts`, tidak ada halaman |
| Kategori produk                      | API ada, tidak ada halaman                |
| Operation documents (PO/GR/transfer) | API ada, tidak ada halaman                |
| Mutasi stok                          | Endpoint ada, tidak ada halaman dedicated |

### C. UI sangat text-based, tidak ada chart library

Semua laporan ditampilkan sebagai list teks. Majoo punya chart visual yang informatif. Lecrion hanya punya bar chart sederhana dari `<div>` HTML — tidak ada library seperti Recharts atau Chart.js.

### D. Tidak ada HPP/cost price

Tanpa `cost_price` di produk, tidak bisa menghitung:

- Gross margin per produk
- Laporan laba rugi
- HPP per transaksi

Ini **blocker** untuk semua fitur keuangan yang lebih dalam.

### E. Tidak ada supplier management

Purchase Order ada di `operation_documents` tapi tidak ada tabel `suppliers` yang proper — hanya string `supplier_name`. Tidak bisa:

- Lookup supplier saat buat PO
- Riwayat pembelian per supplier
- Hutang ke supplier

---

## 4. Prioritas Implementasi

### Tier 1 — Blocker untuk production use

1. **Form CRUD produk** — tambah/edit/hapus produk di dashboard (API sudah ada)
2. **Halaman manajemen kategori** — API sudah ada, tinggal UI
3. **Halaman user management** — API sudah ada (`POST /api/auth/users`, `GET /api/auth/users`, `PATCH /api/auth/users/:id/role`)
4. **Halaman operation documents** — PO/GR/stock transfer/adjustment — API sudah ada
5. **HPP/cost price** — tambah kolom `cost_price` di tabel `menu` + migration

### Tier 2 — Sangat meningkatkan usability

6. **Chart library (Recharts)** — untuk laporan visual yang informatif
7. **Export CSV/PDF** — untuk laporan penjualan, produk, kasir
8. **Hold order / multiple cart** — di POS cashier
9. **Form create/edit produk di POS web** — untuk kasir yang perlu tambah produk cepat
10. **Supplier management** — tabel `suppliers` + link ke operation documents

### Tier 3 — Enterprise features

11. **Opname stok** — stock count/stocktake dengan selisih
12. **Resep/recipe** — bahan baku per produk (untuk F&B)
13. **Bundle pricing** dan **Buy X Get Y** — promo engine extension
14. **Laporan laba rugi** — butuh HPP (Tier 1 item 5) dulu
15. **Komisi karyawan** — berdasarkan penjualan per kasir

---

## 5. Kesimpulan

Lecrion sudah punya **fondasi backend yang sangat solid**:

- Atomic POS transaction ✅
- RBAC dengan role hierarchy ✅
- Offline mode + sync queue ✅
- Correction flow (void/refund/return) ✅
- Operation documents (PO/GR/transfer) ✅
- Inventory locations ✅
- Customer loyalty + promotions ✅
- F&B vertical (KDS/tables) ✅

Yang kurang adalah **lapisan UI** yang mengekspos fitur-fitur itu ke pengguna.

> Kalau dibandingkan Majoo: backend Lecrion sudah setara atau lebih baik di beberapa area. Tapi dari sisi **operator experience** — apa yang bisa dilakukan owner/kasir dari UI — Lecrion masih jauh di belakang karena banyak fitur backend yang tidak punya UI-nya.

**Ini bukan masalah arsitektur. Ini masalah halaman yang belum dibuat.**

---

## 6. Referensi File

| Domain          | Backend (sudah ada)                                         | Frontend (perlu dibuat)                    |
| --------------- | ----------------------------------------------------------- | ------------------------------------------ |
| Produk CRUD     | `CatalogController` `POST/PATCH /api/products`              | Dashboard: halaman `/products` dengan form |
| Kategori        | `CategoriesController` `GET/POST/PATCH /api/categories`     | Dashboard: halaman `/categories`           |
| User management | `AuthController` `POST/GET/PATCH /api/auth/users`           | Dashboard: halaman `/users`                |
| Operation docs  | `OperationsController` `GET/POST /api/operations/documents` | Dashboard: halaman `/operations`           |
| HPP/cost price  | —                                                           | Migration + kolom `cost_price` di `menu`   |
| Supplier        | —                                                           | Tabel `suppliers` + migration + service    |
| Opname stok     | —                                                           | Endpoint + halaman                         |
| Mutasi stok     | `InventoryController` `GET /api/inventory/movements`        | Dashboard: sub-halaman di Inventory        |
