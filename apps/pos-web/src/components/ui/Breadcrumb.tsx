// apps/pos-web/src/components/ui/Breadcrumb.tsx
//
// Auto-breadcrumb from the current URL path.
// Returns null for top-level routes (depth ≤ 1) — only shows for nested paths
// like /orders/:id, /chatbot/chats, /products/:id, etc.

import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

/** Segment → human-readable label */
const LABELS: Record<string, string> = {
  dashboard:  "Dashboard",
  kasir:      "Kasir",
  orders:     "Pesanan",
  products:   "Produk",
  categories: "Kategori",
  inventory:  "Inventori",
  operations: "PO / GR / Transfer",
  suppliers:  "Supplier",
  invoices:   "Invoices",
  cashflow:   "Manajemen Kas",
  reports:    "Laporan",
  settings:   "Pengaturan",
  users:      "Pengguna",
  toko:       "Konfigurasi Toko",
  notifikasi: "Notifikasi & WhatsApp",
  bisnis:     "Kategori Bisnis",
  pengguna:   "Manajemen Pengguna",
  chatbot:    "Chatbot",
  chats:      "Chat History",
  live:       "Live Feed",
  llm:        "LLM Console",
  support:    "Support",
  stores:     "Verifikasi Store",
  kds:        "KDS",
  sales:      "Penjualan",
  tables:     "Meja",
  reservations: "Reservasi",
  checkins:   "Check-in / Check-out",
  returns:    "Retur / Refund",
  modifiers:  "Modifier",
  recipes:    "Resep / BOM",
  variants:   "Varian",
  barcodes:   "Barcode / SKU",
  rooms:      "Tipe Kamar",
  services:   "Layanan Tambahan",
  amenities:  "Amenities",
  movements:  "Mutasi Stok",
  transfers:  "Transfer Stok",
  "purchase-orders": "Purchase Order",
  "goods-receipts": "Penerimaan Barang",
  "stock-opname": "Stock Opname",
  "unit-conversion": "Satuan & Konversi",
  "project-pricing": "Harga Proyek",
  "stay-packages": "Paket Menginap",
  menu:       "Menu",
  revenue:    "Pendapatan",
  "delivery-schedule": "Jadwal Pengiriman",
};

interface Crumb { label: string; to?: string }

function parse(pathname: string): Crumb[] {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return [];
  const crumbs: Crumb[] = [];
  let path = "";
  segs.forEach((seg, i) => {
    path += `/${seg}`;
    const isLast    = i === segs.length - 1;
    const isNumeric = /^\d+$/.test(seg);
    crumbs.push({
      label: isNumeric ? `#${seg}` : (LABELS[seg] ?? seg),
      to:    isLast ? undefined : path,
    });
  });
  return crumbs;
}

export default function Breadcrumb() {
  const { pathname } = useLocation();
  const crumbs = parse(pathname);
  if (!crumbs.length) return null;

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link to="/dashboard" className="breadcrumb-item breadcrumb-link" title="Dashboard">
        <Home size={11} />
      </Link>
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
          <ChevronRight size={11} className="breadcrumb-sep" />
          {c.to ? (
            <Link to={c.to} className="breadcrumb-item breadcrumb-link">{c.label}</Link>
          ) : (
            <span className="breadcrumb-item breadcrumb-current">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
