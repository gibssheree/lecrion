// apps/pos-web/src/store/support-preview.store.ts
//
// Support Preview Mode — allows Lecrion support staff (role === "support")
// to preview, test, and experience the full UI and UX of any business vertical
// as an Owner without creating separate merchant accounts.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SupportVerticalDef {
  key: string;
  preset: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  features: string[];
}

export const SUPPORT_VERTICALS: SupportVerticalDef[] = [
  {
    key: "general",
    preset: "retail_store",
    name: "General / Bisnis Campuran",
    icon: "🏪",
    tagline: "Point of Sale serbaguna untuk semua jenis toko umum",
    description:
      "Alur transaksi kasir standar dengan katalog produk umum, pembayaran tunai/QRIS, dan laporan penjualan.",
    features: [
      "Kasir POS Serbaguna",
      "Katalog Produk & Kategori",
      "Manajemen Kasflow & Invoice",
      "Laporan Penjualan Harian",
    ],
  },
  {
    key: "restaurant_cafe",
    preset: "restaurant",
    name: "Restoran & Cafe (F&B)",
    icon: "🍽️",
    tagline: "Manajemen Meja, KDS Dapur, Resep BOM, Dine-in & Delivery",
    description:
      "Modul lengkap restoran/cafe meliputi denah meja & reservasi, layar kitchen display (KDS), takaran bahan resep (BOM), dan pilihan Dine-in/Take-away/Delivery.",
    features: [
      "Denah Meja & Layout Status",
      "Kitchen Display System (KDS)",
      "Resep / BOM & Takaran Bahan",
      "Modifier / Extra Menu",
      "Tablet Stacking Online Order",
    ],
  },
  {
    key: "retail",
    preset: "retail_store",
    name: "Toko Retail & Minimarket",
    icon: "🛒",
    tagline: "Barcode scanner, Varian produk, dan Stock Opname",
    description:
      "Alur operasional retail modern dengan pemindaian barcode cepat, manajemen varian ukuran/warna, pencatatan fisik stok (Stock Opname), dan retur/tukar barang.",
    features: [
      "Pemindaian Barcode / SKU",
      "Varian Produk (Warna/Ukuran)",
      "Audit Stock Opname Fisik",
      "Retur / Pengembalian Barang",
      "Loyalty Points Pelanggan",
    ],
  },
  {
    key: "accommodation_hotel",
    preset: "accommodation",
    name: "Akomodasi & Hotel",
    icon: "🏨",
    tagline: "Kamar, Check-in / Check-out, Layanan Tamu & Amenities",
    description:
      "Sistem operasional hotel/penginapan meliputi kalender reservasi kamar, proses Check-in/Check-out tamu, tagihan layanan kamar, dan stok konsumsi amenities.",
    features: [
      "Kalender & Tipe Kamar",
      "Proses Check-in & Check-out",
      "Billing Layanan & Add-on Tamu",
      "Stok Amenities & Toiletries",
      "Paket Menginap",
    ],
  },
  {
    key: "construction_materials",
    preset: "building_materials",
    name: "Toko Bangunan & Material",
    icon: "🧱",
    tagline: "Pengiriman material, Konversi satuan grosir, & Harga proyek",
    description:
      "Modul khusus toko bahan bangunan untuk jadwal armada pengiriman proyek, konversi satuan grosir ke eceran (sak/dus/batang/m²), harga khusus kontraktor, dan stok per lokasi gudang.",
    features: [
      "Jadwal Armada Pengiriman Proyek",
      "Konversi Satuan Berperingkat (Sak/Dus/Batang)",
      "Katalog Harga Proyek & Kontraktor",
      "Stok Per Lokasi Gudang",
      "Transfer Stok Antar Gudang",
    ],
  },
];

interface SupportPreviewState {
  isPreviewActive: boolean;
  activeVerticalKey: string | null;
  activePreset: string | null;
  enablePreview: (verticalKey: string) => void;
  disablePreview: () => void;
}

export const useSupportPreviewStore = create<SupportPreviewState>()(
  persist(
    (set) => ({
      isPreviewActive: false,
      activeVerticalKey: null,
      activePreset: null,

      enablePreview: (verticalKey) => {
        const found = SUPPORT_VERTICALS.find(
          (v) => v.key === verticalKey || v.preset === verticalKey,
        );
        if (found) {
          set({
            isPreviewActive: true,
            activeVerticalKey: found.key,
            activePreset: found.preset,
          });
        }
      },

      disablePreview: () => {
        set({
          isPreviewActive: false,
          activeVerticalKey: null,
          activePreset: null,
        });
      },
    }),
    { name: "support-vertical-preview" },
  ),
);
