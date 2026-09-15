// prisma/seed-demo.ts
//
// Demo tenants for QA — two stores with a full catalog and ~2 weeks of
// transaction history, so the dashboard, reports and till have real numbers
// to render instead of empty states.
//
//   demo-cafe   "Kopi Senja"    — F&B UMKM cafe (preset "cafe", tier business)
//   demo-hotel  "Wisma Melati"  — accommodation (preset "accommodation", tier enterprise)
//
// Run:  npm run db:seed:demo     (safe to re-run — wipes and rebuilds both
//                                 demo stores, never touches default-store)
//
// ── Two things worth knowing before reading the data below ──────────────────
//
// 1. The hotel store sells *products*, not room bookings. There are no rooms,
//    reservations, check-in, folio or housekeeping tables in this schema
//    (see ea22c11) — room-nights are modelled as service products rung up at
//    the front desk. That is the flow a hotel merchant can actually use today.
//
// 2. Every timestamp is written explicitly. The `@default("datetime('now')")`
//    in schema.prisma is a *literal string* default, not a SQL expression:
//    omitting created_at stores the text "datetime('now')" (see the rows
//    prisma/seed.ts left in `users`).

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as bcrypt from "bcryptjs";
import * as path from "path";

const db = path.resolve(__dirname, "../database/canteen.db");
const adapter = new PrismaBetterSqlite3({ url: db });
const prisma = new PrismaClient({ adapter } as any);

const HISTORY_DAYS = 14;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Deterministic PRNG (LCG) so re-runs produce identical data. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Rng = () => number;

const randInt = (rng: Rng, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));

function pickWeighted<T>(rng: Rng, items: T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/** Money rounding — mirrors PosCalculationService.round (2 decimals). */
const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Build an ISO timestamp for a local wall-clock moment, exactly as the API
 * does (`new Date().toISOString()`). Reports read the hour with SQLite's
 * strftime('%H', created_at), which is UTC — so demo data carries the same
 * timezone offset real sales do, rather than a prettier fake.
 */
function isoAt(day: Date, hour: number, minute: number): string {
  const d = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hour,
    minute,
    randSeconds(hour, minute),
  );
  return d.toISOString();
}

function randSeconds(hour: number, minute: number): number {
  return (hour * 7 + minute * 13) % 60;
}

function dayOffset(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

/** Cash tendered — rounds the total up to a note a customer would hand over. */
function cashTendered(total: number): number {
  const step = total <= 50000 ? 5000 : total <= 200000 ? 10000 : 50000;
  return Math.ceil(total / step) * step;
}

// ── Store specs ─────────────────────────────────────────────────────────────

interface SeedProduct {
  key: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  weight: number;
  tracked?: boolean;
  stock?: number;
  restockQty?: number;
  type?: string;
  unitName?: string;
  unitCode?: string;
  sku: string;
  description?: string;
}

interface SeedUser {
  email: string;
  password: string;
  role: string;
  label: string;
}

interface StoreSpec {
  id: string;
  name: string;
  tier: string;
  preset: string;
  vertical: string;
  businessType: string;
  settings: Record<string, string>;
  taxRate: number;
  serviceChargeRate: number;
  taxMode: "exclusive" | "inclusive";
  disabledModules: string[];
  users: SeedUser[];
  categories: Array<{ slug: string; name: string; sort: number }>;
  products: SeedProduct[];
  modifierGroups: Array<{
    name: string;
    selectionType: string;
    required: boolean;
    minSelect: number;
    maxSelect: number | null;
    appliesTo: string[];
    options: Array<{ name: string; delta: number }>;
  }>;
  recipes: Array<{
    product: string;
    yieldQty: number;
    yieldUnit: string;
    ingredients: Array<{ material: string; qty: number }>;
  }>;
  customers: Array<{
    name: string;
    phone: string;
    tier: string;
    notes?: string;
  }>;
  openingCash: number;
  salesPerDay: [number, number];
  hourWeights: number[];
  orderTypes: Array<[string, number]>;
  payments: Array<[string, number]>;
  splitPaymentChance: number;
  /** Split payment only kicks in above this total — a 20k coffee is never split. */
  splitMinTotal: number;
  discountChance: number;
  discountReasons: string[];
  customerChance: number;
  seed: number;
  /** Picks the line items for one sale. */
  composeSale: (
    rng: Rng,
    byCategory: (slug: string) => SeedProduct[],
  ) => Array<{
    product: SeedProduct;
    qty: number;
  }>;
}

// ── Kopi Senja — F&B UMKM cafe (Sleman, DIY) ────────────────────────────────

const CAFE: StoreSpec = {
  id: "demo-cafe",
  name: "Kopi Senja",
  tier: "business",
  preset: "cafe",
  vertical: "restaurant_cafe",
  businessType: "cafe",
  // No PPN — a UMKM cafe this size is not a PKP, so the shelf price is what
  // the customer pays. The hotel below carries tax + service charge instead,
  // so both branches of the calc policy get exercised.
  taxRate: 0,
  serviceChargeRate: 0,
  taxMode: "exclusive",
  disabledModules: [],
  settings: {
    storeName: "Kopi Senja",
    storeAddress: "Jl. Kaliurang KM 5,6 No. 12, Sleman, DIY",
    storePhone: "0274555120",
    ownerName: "Rangga Aditya",
    ownerPhone: "081234500001",
    city: "Sleman",
    defaultOrderType: "dine_in",
    kasirPaymentMethods: "tunai,qris,transfer",
    hideProductStock: "false",
    requireOpeningCash: "true",
    requireClosingCash: "true",
    lowStockAlertsEnabled: "true",
    lowStockThreshold: "10",
    adminPhones: "081234500001",
  },
  users: [
    {
      email: "owner@kopisenja.id",
      password: "kopi123",
      role: "owner",
      label: "Owner",
    },
    {
      email: "manajer@kopisenja.id",
      password: "kopi123",
      role: "manager",
      label: "Manajer",
    },
    {
      email: "kasir@kopisenja.id",
      password: "kopi123",
      role: "cashier",
      label: "Kasir",
    },
  ],
  categories: [
    { slug: "kopi", name: "Kopi", sort: 1 },
    { slug: "non-coffee", name: "Non-Coffee", sort: 2 },
    { slug: "snack", name: "Snack", sort: 3 },
    { slug: "bahan-baku", name: "Bahan Baku", sort: 9 },
  ],
  products: [
    // ── Kopi ────────────────────────────────────────────────────────────────
    {
      key: "espresso",
      name: "Espresso",
      category: "kopi",
      price: 15000,
      cost: 4500,
      weight: 4,
      sku: "KOP-001",
    },
    {
      key: "americano",
      name: "Americano",
      category: "kopi",
      price: 18000,
      cost: 5000,
      weight: 8,
      sku: "KOP-002",
    },
    {
      key: "kopsus",
      name: "Kopi Susu Gula Aren",
      category: "kopi",
      price: 20000,
      cost: 6000,
      weight: 22,
      sku: "KOP-003",
      description: "Menu andalan: espresso, susu segar, gula aren cair",
    },
    {
      key: "cappuccino",
      name: "Cappuccino",
      category: "kopi",
      price: 25000,
      cost: 7500,
      weight: 10,
      sku: "KOP-004",
    },
    {
      key: "latte",
      name: "Caffe Latte",
      category: "kopi",
      price: 25000,
      cost: 7500,
      weight: 10,
      sku: "KOP-005",
    },
    {
      key: "tubruk",
      name: "Kopi Tubruk",
      category: "kopi",
      price: 12000,
      cost: 3000,
      weight: 6,
      sku: "KOP-006",
    },
    {
      key: "v60",
      name: "V60 Manual Brew",
      category: "kopi",
      price: 28000,
      cost: 8000,
      weight: 4,
      sku: "KOP-007",
    },
    {
      key: "macchiato",
      name: "Caramel Macchiato",
      category: "kopi",
      price: 30000,
      cost: 9000,
      weight: 6,
      sku: "KOP-008",
    },
    // ── Non-Coffee ──────────────────────────────────────────────────────────
    {
      key: "matcha",
      name: "Matcha Latte",
      category: "non-coffee",
      price: 25000,
      cost: 8000,
      weight: 8,
      sku: "NON-001",
    },
    {
      key: "cokelat",
      name: "Cokelat Panas",
      category: "non-coffee",
      price: 22000,
      cost: 6500,
      weight: 6,
      sku: "NON-002",
    },
    {
      key: "redvelvet",
      name: "Red Velvet Latte",
      category: "non-coffee",
      price: 24000,
      cost: 7000,
      weight: 5,
      sku: "NON-003",
    },
    {
      key: "tehtarik",
      name: "Teh Tarik",
      category: "non-coffee",
      price: 18000,
      cost: 5000,
      weight: 5,
      sku: "NON-004",
    },
    {
      key: "lemontea",
      name: "Lemon Tea",
      category: "non-coffee",
      price: 15000,
      cost: 4000,
      weight: 5,
      sku: "NON-005",
    },
    {
      key: "thaitea",
      name: "Thai Tea",
      category: "non-coffee",
      price: 20000,
      cost: 6000,
      weight: 6,
      sku: "NON-006",
    },
    {
      key: "air-mineral",
      name: "Air Mineral 600ml",
      category: "non-coffee",
      price: 5000,
      cost: 2500,
      weight: 5,
      sku: "NON-007",
      tracked: true,
      stock: 120,
      restockQty: 120,
    },
    // ── Snack ───────────────────────────────────────────────────────────────
    {
      key: "pisgor",
      name: "Pisang Goreng Cokelat",
      category: "snack",
      price: 15000,
      cost: 5000,
      weight: 8,
      sku: "SNK-001",
    },
    {
      key: "kentang",
      name: "Kentang Goreng",
      category: "snack",
      price: 18000,
      cost: 6000,
      weight: 7,
      sku: "SNK-002",
    },
    {
      key: "rotibakar",
      name: "Roti Bakar Cokelat Keju",
      category: "snack",
      price: 20000,
      cost: 6500,
      weight: 6,
      sku: "SNK-003",
    },
    {
      key: "tahucrispy",
      name: "Tahu Crispy",
      category: "snack",
      price: 15000,
      cost: 4500,
      weight: 5,
      sku: "SNK-004",
    },
    {
      key: "croissant",
      name: "Croissant Butter",
      category: "snack",
      price: 18000,
      cost: 7000,
      weight: 4,
      sku: "SNK-005",
    },
    {
      key: "donat",
      name: "Donat Gula",
      category: "snack",
      price: 10000,
      cost: 3500,
      weight: 4,
      sku: "SNK-006",
    },
    // ── Bahan baku: product_type "material", stock-tracked, never sold ──────
    {
      key: "m-biji",
      name: "Biji Kopi Arabika",
      category: "bahan-baku",
      price: 180,
      cost: 180,
      weight: 0,
      sku: "BHN-001",
      type: "material",
      tracked: true,
      stock: 6000,
      restockQty: 5000,
      unitName: "Gram",
      unitCode: "g",
    },
    {
      key: "m-susu",
      name: "Susu UHT Full Cream",
      category: "bahan-baku",
      price: 20,
      cost: 20,
      weight: 0,
      sku: "BHN-002",
      type: "material",
      tracked: true,
      stock: 24000,
      restockQty: 12000,
      unitName: "Mililiter",
      unitCode: "ml",
    },
    {
      key: "m-gularen",
      name: "Gula Aren Cair",
      category: "bahan-baku",
      price: 35,
      cost: 35,
      weight: 0,
      sku: "BHN-003",
      type: "material",
      tracked: true,
      stock: 6000,
      restockQty: 3000,
      unitName: "Mililiter",
      unitCode: "ml",
    },
    {
      key: "m-matcha",
      name: "Bubuk Matcha",
      category: "bahan-baku",
      price: 400,
      cost: 400,
      weight: 0,
      sku: "BHN-004",
      type: "material",
      tracked: true,
      stock: 1200,
      restockQty: 1000,
      unitName: "Gram",
      unitCode: "g",
    },
    {
      key: "m-karamel",
      name: "Sirup Karamel",
      category: "bahan-baku",
      price: 90,
      cost: 90,
      weight: 0,
      sku: "BHN-005",
      type: "material",
      tracked: true,
      stock: 2400,
      restockQty: 2000,
      unitName: "Mililiter",
      unitCode: "ml",
    },
    {
      key: "m-roti",
      name: "Roti Tawar",
      category: "bahan-baku",
      price: 2000,
      cost: 2000,
      weight: 0,
      sku: "BHN-006",
      type: "material",
      tracked: true,
      stock: 120,
      restockQty: 100,
      unitName: "Lembar",
      unitCode: "lbr",
    },
    {
      key: "m-pisang",
      name: "Pisang Kepok",
      category: "bahan-baku",
      price: 2500,
      cost: 2500,
      weight: 0,
      sku: "BHN-007",
      type: "material",
      tracked: true,
      stock: 100,
      restockQty: 80,
      unitName: "Buah",
      unitCode: "bh",
    },
  ],
  modifierGroups: [
    {
      name: "Ukuran",
      selectionType: "single",
      required: true,
      minSelect: 1,
      maxSelect: 1,
      appliesTo: ["kopi", "non-coffee"],
      options: [
        { name: "Regular", delta: 0 },
        { name: "Large", delta: 6000 },
      ],
    },
    {
      name: "Suhu",
      selectionType: "single",
      required: true,
      minSelect: 1,
      maxSelect: 1,
      appliesTo: ["kopi", "non-coffee"],
      options: [
        { name: "Panas", delta: 0 },
        { name: "Dingin (Ice)", delta: 3000 },
      ],
    },
    {
      name: "Level Gula",
      selectionType: "single",
      required: false,
      minSelect: 0,
      maxSelect: 1,
      appliesTo: ["kopi", "non-coffee"],
      options: [
        { name: "Normal", delta: 0 },
        { name: "Less Sugar", delta: 0 },
        { name: "No Sugar", delta: 0 },
      ],
    },
    {
      name: "Tambahan",
      selectionType: "multiple",
      required: false,
      minSelect: 0,
      maxSelect: 3,
      appliesTo: ["kopi", "non-coffee"],
      options: [
        { name: "Extra Shot", delta: 6000 },
        { name: "Oat Milk", delta: 8000 },
        { name: "Extra Es Batu", delta: 0 },
        { name: "Whipped Cream", delta: 5000 },
      ],
    },
  ],
  recipes: [
    {
      product: "kopsus",
      yieldQty: 1,
      yieldUnit: "gelas",
      ingredients: [
        { material: "m-biji", qty: 18 },
        { material: "m-susu", qty: 150 },
        { material: "m-gularen", qty: 20 },
      ],
    },
    {
      product: "americano",
      yieldQty: 1,
      yieldUnit: "gelas",
      ingredients: [{ material: "m-biji", qty: 18 }],
    },
    {
      product: "cappuccino",
      yieldQty: 1,
      yieldUnit: "gelas",
      ingredients: [
        { material: "m-biji", qty: 18 },
        { material: "m-susu", qty: 120 },
      ],
    },
    {
      product: "latte",
      yieldQty: 1,
      yieldUnit: "gelas",
      ingredients: [
        { material: "m-biji", qty: 18 },
        { material: "m-susu", qty: 180 },
      ],
    },
    {
      product: "macchiato",
      yieldQty: 1,
      yieldUnit: "gelas",
      ingredients: [
        { material: "m-biji", qty: 18 },
        { material: "m-susu", qty: 150 },
        { material: "m-karamel", qty: 30 },
      ],
    },
    {
      product: "matcha",
      yieldQty: 1,
      yieldUnit: "gelas",
      ingredients: [
        { material: "m-matcha", qty: 8 },
        { material: "m-susu", qty: 180 },
        { material: "m-gularen", qty: 15 },
      ],
    },
    {
      product: "rotibakar",
      yieldQty: 1,
      yieldUnit: "porsi",
      ingredients: [{ material: "m-roti", qty: 4 }],
    },
    {
      product: "pisgor",
      yieldQty: 1,
      yieldUnit: "porsi",
      ingredients: [{ material: "m-pisang", qty: 3 }],
    },
  ],
  customers: [
    {
      name: "Rina Setiawati",
      phone: "081234500111",
      tier: "gold",
      notes: "Langganan pagi, selalu Kopi Susu Gula Aren",
    },
    { name: "Bagus Prasetyo", phone: "081234500222", tier: "regular" },
    { name: "Dewi Anggraini", phone: "081234500333", tier: "silver" },
    { name: "Yoga Pratama", phone: "081234500444", tier: "regular" },
    {
      name: "Sinta Maharani",
      phone: "081234500555",
      tier: "gold",
      notes: "Sering pesan untuk rapat kantor",
    },
    { name: "Andi Nugroho", phone: "081234500666", tier: "regular" },
  ],
  openingCash: 300000,
  salesPerDay: [14, 30],
  //            0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
  hourWeights: [
    0, 0, 0, 0, 0, 0, 2, 6, 9, 7, 5, 4, 5, 4, 4, 6, 8, 9, 8, 7, 5, 3, 0, 0,
  ],
  orderTypes: [
    ["dine_in", 55],
    ["pickup", 40],
    ["delivery", 5],
  ],
  payments: [
    ["QRIS", 45],
    ["Cash", 40],
    ["Transfer", 15],
  ],
  splitPaymentChance: 0.1,
  splitMinTotal: 40000,
  discountChance: 0.12,
  discountReasons: ["Promo member", "Voucher grand opening", "Diskon karyawan"],
  customerChance: 0.4,
  seed: 20260830,
  composeSale: (rng, byCategory) => {
    const drinks = [...byCategory("kopi"), ...byCategory("non-coffee")];
    const snacks = byCategory("snack");
    const lines: Array<{ product: SeedProduct; qty: number }> = [];
    const seen = new Set<string>();
    const drinkCount = randInt(rng, 1, 3);
    for (let i = 0; i < drinkCount; i++) {
      const p = pickWeighted(rng, drinks, (x) => x.weight);
      if (seen.has(p.key)) continue;
      seen.add(p.key);
      lines.push({ product: p, qty: rng() < 0.2 ? 2 : 1 });
    }
    if (rng() < 0.55) {
      const s = pickWeighted(rng, snacks, (x) => x.weight);
      lines.push({ product: s, qty: rng() < 0.15 ? 2 : 1 });
    }
    return lines;
  },
};

// ── Wisma Melati — accommodation / hotel (Yogyakarta) ───────────────────────
//
// Rooms are sold as service products (one line = one room-night), because
// this schema has no rooms/reservations/folio tables. Everything here is what
// a front desk can actually ring up in Lecrion today.

const HOTEL: StoreSpec = {
  id: "demo-hotel",
  name: "Wisma Melati",
  tier: "enterprise",
  preset: "accommodation",
  vertical: "accommodation_hotel",
  businessType: "accommodation",
  // PPN 11% on top, plus a 5% service charge — the usual hotel bill shape.
  // Note the rates are stored as decimal fractions: PosCalculationService
  // .parseRate() rejects anything > 1 and silently falls back to 0.
  taxRate: 0.11,
  serviceChargeRate: 0.05,
  taxMode: "exclusive",
  disabledModules: [],
  settings: {
    storeName: "Wisma Melati",
    storeAddress: "Jl. Prawirotaman No. 45, Mergangsan, Yogyakarta",
    storePhone: "0274388900",
    ownerName: "Hesti Widiastuti",
    ownerPhone: "081298760000",
    city: "Yogyakarta",
    defaultOrderType: "pickup",
    kasirPaymentMethods: "tunai,qris,transfer",
    hideProductStock: "false",
    requireOpeningCash: "true",
    requireClosingCash: "true",
    lowStockAlertsEnabled: "true",
    lowStockThreshold: "15",
    adminPhones: "081298760000",
  },
  users: [
    {
      email: "owner@wismamelati.id",
      password: "melati123",
      role: "owner",
      label: "Owner",
    },
    {
      email: "manajer@wismamelati.id",
      password: "melati123",
      role: "manager",
      label: "Manajer",
    },
    {
      email: "resepsionis@wismamelati.id",
      password: "melati123",
      role: "cashier",
      label: "Resepsionis",
    },
  ],
  categories: [
    { slug: "kamar", name: "Kamar", sort: 1 },
    { slug: "restoran", name: "Restoran", sort: 2 },
    { slug: "laundry", name: "Laundry", sort: 3 },
    { slug: "minibar", name: "Minibar", sort: 4 },
    { slug: "layanan-tambahan", name: "Layanan Tambahan", sort: 5 },
  ],
  products: [
    // ── Kamar: one line = one room-night ────────────────────────────────────
    {
      key: "std-fan",
      name: "Kamar Standard Fan",
      category: "kamar",
      price: 250000,
      cost: 90000,
      weight: 8,
      sku: "KMR-001",
      type: "service",
      unitName: "Malam",
      unitCode: "mlm",
      description: "Kamar kipas angin, kamar mandi dalam, 1 bed",
    },
    {
      key: "std-ac",
      name: "Kamar Standard AC",
      category: "kamar",
      price: 350000,
      cost: 120000,
      weight: 14,
      sku: "KMR-002",
      type: "service",
      unitName: "Malam",
      unitCode: "mlm",
      description: "AC, TV, air panas, termasuk sarapan 1 orang",
    },
    {
      key: "superior",
      name: "Kamar Superior AC",
      category: "kamar",
      price: 450000,
      cost: 150000,
      weight: 10,
      sku: "KMR-003",
      type: "service",
      unitName: "Malam",
      unitCode: "mlm",
      description: "Kamar lebih luas, termasuk sarapan 2 orang",
    },
    {
      key: "deluxe",
      name: "Kamar Deluxe Twin",
      category: "kamar",
      price: 650000,
      cost: 200000,
      weight: 6,
      sku: "KMR-004",
      type: "service",
      unitName: "Malam",
      unitCode: "mlm",
    },
    {
      key: "suite",
      name: "Family Suite",
      category: "kamar",
      price: 950000,
      cost: 300000,
      weight: 3,
      sku: "KMR-005",
      type: "service",
      unitName: "Malam",
      unitCode: "mlm",
      description: "2 kamar terhubung, kapasitas 4 orang",
    },
    // ── Restoran ────────────────────────────────────────────────────────────
    {
      key: "nasgor",
      name: "Nasi Goreng Spesial",
      category: "restoran",
      price: 45000,
      cost: 15000,
      weight: 10,
      sku: "RST-001",
    },
    {
      key: "migoreng",
      name: "Mi Goreng Jawa",
      category: "restoran",
      price: 40000,
      cost: 13000,
      weight: 7,
      sku: "RST-002",
    },
    {
      key: "ayamkremes",
      name: "Ayam Goreng Kremes",
      category: "restoran",
      price: 55000,
      cost: 20000,
      weight: 6,
      sku: "RST-003",
    },
    {
      key: "sarapan",
      name: "Sarapan Prasmanan",
      category: "restoran",
      price: 75000,
      cost: 25000,
      weight: 8,
      sku: "RST-004",
      description: "Untuk tamu tanpa paket sarapan",
    },
    {
      key: "kopitubruk",
      name: "Kopi Tubruk",
      category: "restoran",
      price: 15000,
      cost: 4000,
      weight: 8,
      sku: "RST-005",
    },
    {
      key: "tehmanis",
      name: "Teh Manis Hangat",
      category: "restoran",
      price: 10000,
      cost: 2500,
      weight: 8,
      sku: "RST-006",
    },
    // ── Laundry ─────────────────────────────────────────────────────────────
    {
      key: "cuci-setrika",
      name: "Cuci Setrika (per kg)",
      category: "laundry",
      price: 15000,
      cost: 5000,
      weight: 5,
      sku: "LDR-001",
      type: "service",
      unitName: "Kilogram",
      unitCode: "kg",
    },
    {
      key: "laundry-express",
      name: "Laundry Ekspres 6 Jam (per kg)",
      category: "laundry",
      price: 25000,
      cost: 9000,
      weight: 3,
      sku: "LDR-002",
      type: "service",
      unitName: "Kilogram",
      unitCode: "kg",
    },
    // ── Minibar: the only stock-tracked goods in the hotel ──────────────────
    {
      key: "h-air",
      name: "Air Mineral 600ml",
      category: "minibar",
      price: 8000,
      cost: 3000,
      weight: 10,
      sku: "MNB-001",
      tracked: true,
      stock: 200,
      restockQty: 200,
    },
    {
      key: "h-cola",
      name: "Coca-Cola Kaleng",
      category: "minibar",
      price: 12000,
      cost: 6000,
      weight: 6,
      sku: "MNB-002",
      tracked: true,
      stock: 120,
      restockQty: 120,
    },
    {
      key: "h-kacang",
      name: "Kacang Garuda",
      category: "minibar",
      price: 10000,
      cost: 4500,
      weight: 5,
      sku: "MNB-003",
      tracked: true,
      stock: 90,
      restockQty: 90,
    },
    {
      key: "h-kopisachet",
      name: "Kopi Sachet",
      category: "minibar",
      price: 7000,
      cost: 2500,
      weight: 5,
      sku: "MNB-004",
      tracked: true,
      stock: 150,
      restockQty: 150,
    },
    // ── Layanan tambahan ────────────────────────────────────────────────────
    {
      key: "extrabed",
      name: "Extra Bed",
      category: "layanan-tambahan",
      price: 150000,
      cost: 40000,
      weight: 4,
      sku: "LYN-001",
      type: "service",
      unitName: "Malam",
      unitCode: "mlm",
    },
    {
      key: "late-checkout",
      name: "Late Check-out",
      category: "layanan-tambahan",
      price: 100000,
      cost: 0,
      weight: 3,
      sku: "LYN-002",
      type: "service",
    },
    {
      key: "antar-bandara",
      name: "Antar-Jemput Bandara",
      category: "layanan-tambahan",
      price: 200000,
      cost: 90000,
      weight: 3,
      sku: "LYN-003",
      type: "service",
      unitName: "Trip",
      unitCode: "trip",
    },
    {
      key: "sewa-aula",
      name: "Sewa Aula Meeting (4 jam)",
      category: "layanan-tambahan",
      price: 750000,
      cost: 200000,
      weight: 1,
      sku: "LYN-004",
      type: "service",
      unitName: "Sesi",
      unitCode: "sesi",
    },
  ],
  modifierGroups: [],
  recipes: [],
  customers: [
    { name: "Hendra Wijaya", phone: "081298760001", tier: "regular" },
    {
      name: "Siti Rahayu",
      phone: "081298760002",
      tier: "silver",
      notes: "Rutin menginap tiap awal bulan",
    },
    {
      name: "PT Karya Mandiri",
      phone: "081298760003",
      tier: "gold",
      notes: "Korporat, tagihan bulanan, minta invoice",
    },
    { name: "Kevin Halim", phone: "081298760004", tier: "regular" },
    { name: "Maria Sinaga", phone: "081298760005", tier: "regular" },
  ],
  openingCash: 1000000,
  salesPerDay: [6, 14],
  //            0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
  hourWeights: [
    0, 0, 0, 0, 0, 1, 3, 6, 6, 4, 3, 3, 4, 3, 6, 7, 5, 5, 6, 7, 5, 3, 2, 0,
  ],
  orderTypes: [
    ["pickup", 70],
    ["dine_in", 30],
  ],
  payments: [
    ["Transfer", 40],
    ["Cash", 30],
    ["QRIS", 30],
  ],
  splitPaymentChance: 0.08,
  splitMinTotal: 150000,
  discountChance: 0.15,
  discountReasons: [
    "Diskon korporat",
    "Promo long stay",
    "Kompensasi keluhan tamu",
  ],
  customerChance: 0.65,
  seed: 20260831,
  composeSale: (rng, byCategory) => {
    const rooms = byCategory("kamar");
    const resto = byCategory("restoran");
    const minibar = byCategory("minibar");
    const laundry = byCategory("laundry");
    const extras = byCategory("layanan-tambahan");
    const lines: Array<{ product: SeedProduct; qty: number }> = [];

    if (rng() < 0.45) {
      // Room checkout: room-nights, sometimes with extras on the folio.
      const room = pickWeighted(rng, rooms, (x) => x.weight);
      lines.push({ product: room, qty: randInt(rng, 1, 3) });
      if (rng() < 0.35) {
        lines.push({
          product: pickWeighted(rng, extras, (x) => x.weight),
          qty: 1,
        });
      }
      if (rng() < 0.3) {
        lines.push({
          product: pickWeighted(rng, resto, (x) => x.weight),
          qty: randInt(rng, 1, 2),
        });
      }
      return lines;
    }

    // Walk-in restaurant / minibar / laundry bill.
    const pool = [...resto, ...minibar, ...laundry];
    const seen = new Set<string>();
    const count = randInt(rng, 1, 3);
    for (let i = 0; i < count; i++) {
      const p = pickWeighted(rng, pool, (x) => x.weight);
      if (seen.has(p.key)) continue;
      seen.add(p.key);
      lines.push({
        product: p,
        qty: p.category === "laundry" ? randInt(rng, 2, 5) : randInt(rng, 1, 2),
      });
    }
    return lines;
  },
};

const SPECS: StoreSpec[] = [CAFE, HOTEL];

// ── Cleanup ─────────────────────────────────────────────────────────────────
//
// Every delete is scoped to the demo store ids, so default-store and the
// accounts prisma/seed.ts creates are never touched.

async function wipeDemoStores(storeIds: string[]) {
  await prisma.accommodation_folio_items.deleteMany({
    where: { folio: { store_id: { in: storeIds } } },
  });
  await prisma.accommodation_housekeeping_tasks.deleteMany({
    where: { store_id: { in: storeIds } },
  });
  await prisma.accommodation_folios.deleteMany({
    where: { store_id: { in: storeIds } },
  });
  await prisma.accommodation_stays.deleteMany({
    where: { store_id: { in: storeIds } },
  });
  await prisma.accommodation_reservation_guests.deleteMany({
    where: { reservation: { store_id: { in: storeIds } } },
  });
  await prisma.accommodation_reservations.deleteMany({
    where: { store_id: { in: storeIds } },
  });
  await prisma.accommodation_rooms.deleteMany({
    where: { store_id: { in: storeIds } },
  });
  await prisma.accommodation_room_types.deleteMany({
    where: { store_id: { in: storeIds } },
  });

  const sales = await prisma.pos_sales.findMany({
    where: { store_id: { in: storeIds } },
    select: { id: true },
  });
  const saleIds = sales.map((s) => s.id);
  if (saleIds.length) {
    await prisma.pos_corrections.deleteMany({
      where: { sale_id: { in: saleIds } },
    });
    await prisma.pos_sale_items.deleteMany({
      where: { sale_id: { in: saleIds } },
    });
  }
  await prisma.pos_sales.deleteMany({ where: { store_id: { in: storeIds } } });

  const orders = await prisma.orders.findMany({
    where: { store_id: { in: storeIds } },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length) {
    await prisma.order_ratings.deleteMany({
      where: { order_id: { in: orderIds } },
    });
    await prisma.kitchen_ticket_items.deleteMany({
      where: { ticket: { order_id: { in: orderIds } } },
    });
    await prisma.kitchen_tickets.deleteMany({
      where: { order_id: { in: orderIds } },
    });
    await prisma.payments.deleteMany({ where: { order_id: { in: orderIds } } });
    await prisma.order_items.deleteMany({
      where: { order_id: { in: orderIds } },
    });
  }
  await prisma.orders.deleteMany({ where: { store_id: { in: storeIds } } });
  await prisma.payments.deleteMany({ where: { store_id: { in: storeIds } } });

  await prisma.cashflow_entries.deleteMany({
    where: { store_id: { in: storeIds } },
  });
  await prisma.receipt_sequences.deleteMany({
    where: { store_id: { in: storeIds } },
  });
  await prisma.cash_register_sessions.deleteMany({
    where: { store_id: { in: storeIds } },
  });
  await prisma.stock_change_logs.deleteMany({
    where: { store_id: { in: storeIds } },
  });

  const menus = await prisma.menu.findMany({
    where: { store_id: { in: storeIds } },
    select: { id: true },
  });
  const menuIds = menus.map((m) => m.id);
  if (menuIds.length) {
    const recipes = await prisma.recipes.findMany({
      where: { menu_id: { in: menuIds } },
      select: { id: true },
    });
    await prisma.recipe_ingredients.deleteMany({
      where: {
        OR: [
          { recipe_id: { in: recipes.map((r) => r.id) } },
          { ingredient_menu_id: { in: menuIds } },
        ],
      },
    });
    await prisma.recipes.deleteMany({ where: { menu_id: { in: menuIds } } });
    await prisma.product_modifier_links.deleteMany({
      where: { menu_id: { in: menuIds } },
    });
    await prisma.inventory_stock_balances.deleteMany({
      where: { menu_id: { in: menuIds } },
    });
    await prisma.product_barcodes.deleteMany({
      where: { menu_id: { in: menuIds } },
    });
    await prisma.product_variants.deleteMany({
      where: {
        OR: [
          { parent_product_id: { in: menuIds } },
          { variant_product_id: { in: menuIds } },
        ],
      },
    });
    await prisma.cart_items.deleteMany({
      where: { product_id: { in: menuIds } },
    });
    await prisma.favorites.deleteMany({ where: { menu_id: { in: menuIds } } });
    await prisma.stock_opname_lines.deleteMany({
      where: { menu_id: { in: menuIds } },
    });
  }

  const groups = await prisma.modifier_groups.findMany({
    where: { store_id: { in: storeIds } },
    select: { id: true },
  });
  if (groups.length) {
    await prisma.modifier_options.deleteMany({
      where: { group_id: { in: groups.map((g) => g.id) } },
    });
  }
  await prisma.modifier_groups.deleteMany({
    where: { store_id: { in: storeIds } },
  });

  await prisma.menu.deleteMany({ where: { store_id: { in: storeIds } } });
  await prisma.product_categories.deleteMany({
    where: { store_id: { in: storeIds } },
  });
  await prisma.inventory_stock_balances.deleteMany({
    where: { inventory_locations: { store_id: { in: storeIds } } },
  });
  await prisma.inventory_locations.deleteMany({
    where: { store_id: { in: storeIds } },
  });

  const customers = await prisma.customers.findMany({
    where: { store_id: { in: storeIds } },
    select: { id: true },
  });
  if (customers.length) {
    const customerIds = customers.map((c) => c.id);
    await prisma.customer_points.deleteMany({
      where: { customer_id: { in: customerIds } },
    });
    await prisma.vouchers.deleteMany({
      where: { customer_id: { in: customerIds } },
    });
  }
  await prisma.customers.deleteMany({ where: { store_id: { in: storeIds } } });

  await prisma.store_module_overrides.deleteMany({
    where: { store_id: { in: storeIds } },
  });
  await prisma.store_business_profiles.deleteMany({
    where: { store_id: { in: storeIds } },
  });
  await prisma.store_settings.deleteMany({
    where: { OR: storeIds.map((id) => ({ key: { startsWith: `${id}:` } })) },
  });
  await prisma.users.deleteMany({ where: { store_id: { in: storeIds } } });
  await prisma.stores.deleteMany({ where: { id: { in: storeIds } } });
}

async function seedHotelFrontOffice(
  spec: StoreSpec,
  built: Awaited<ReturnType<typeof seedStore>>,
  createdAt: string,
) {
  if (spec.id !== "demo-hotel") return;

  const roomTypes = await Promise.all([
    prisma.accommodation_room_types.create({
      data: {
        store_id: spec.id,
        code: "STD",
        name: "Standard AC",
        capacity: 2,
        base_rate: 350000,
        created_at: createdAt,
        updated_at: createdAt,
      },
    }),
    prisma.accommodation_room_types.create({
      data: {
        store_id: spec.id,
        code: "SUP",
        name: "Superior AC",
        capacity: 2,
        base_rate: 450000,
        created_at: createdAt,
        updated_at: createdAt,
      },
    }),
    prisma.accommodation_room_types.create({
      data: {
        store_id: spec.id,
        code: "FAM",
        name: "Family Suite",
        capacity: 4,
        base_rate: 950000,
        created_at: createdAt,
        updated_at: createdAt,
      },
    }),
  ]);

  const rooms = [];
  for (let floor = 1; floor <= 2; floor++) {
    for (let number = 1; number <= 6; number++) {
      const roomType =
        number <= 3 ? roomTypes[0] : number <= 5 ? roomTypes[1] : roomTypes[2];
      rooms.push(
        await prisma.accommodation_rooms.create({
          data: {
            store_id: spec.id,
            room_type_id: roomType.id,
            room_number: `${floor}${String(number).padStart(2, "0")}`,
            floor: String(floor),
            status: "clean",
            created_at: createdAt,
            updated_at: createdAt,
          },
        }),
      );
    }
  }

  const today = new Date();
  const isoDate = (offset: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const currentRoom = rooms[0];
  const futureRoom = rooms[1];
  const guest = built.customers[0];

  const reservation = await prisma.accommodation_reservations.create({
    data: {
      store_id: spec.id,
      reservation_number: "RSV-DEMO-0001",
      status: "checked_in",
      customer_id: guest.id,
      room_type_id: currentRoom.room_type_id,
      room_id: currentRoom.id,
      check_in_date: isoDate(-1),
      check_out_date: isoDate(2),
      adults: 2,
      source: "direct",
      rate: 350000,
      created_by: "seed-demo",
      created_at: createdAt,
      updated_at: createdAt,
      guests: {
        create: {
          name: guest.name,
          phone: guest.phone,
          is_primary: true,
          created_at: createdAt,
        },
      },
    },
  });

  const stay = await prisma.accommodation_stays.create({
    data: {
      store_id: spec.id,
      reservation_id: reservation.id,
      room_id: currentRoom.id,
      primary_guest_name: guest.name,
      status: "checked_in",
      actual_check_in_at: new Date().toISOString(),
      expected_check_out: isoDate(2),
      checked_in_by: String(built.users.cashier.id),
      created_at: createdAt,
      updated_at: createdAt,
    },
  });
  await prisma.accommodation_rooms.update({
    where: { id: currentRoom.id },
    data: { status: "occupied", updated_at: new Date().toISOString() },
  });
  const folio = await prisma.accommodation_folios.create({
    data: {
      store_id: spec.id,
      folio_number: "FOL-DEMO-0001",
      reservation_id: reservation.id,
      stay_id: stay.id,
      customer_id: guest.id,
      subtotal: 1050000,
      tax: 115500,
      service_charge: 52500,
      total: 1268000,
      balance_due: 1268000,
      created_at: createdAt,
      updated_at: createdAt,
      items: {
        create: [
          {
            source_type: "room_charge",
            source_id: String(currentRoom.id),
            description: "Standard AC x 3 malam",
            quantity: 3,
            unit_price: 350000,
            total: 1050000,
            posted_by: "seed-demo",
            posted_at: createdAt,
          },
          {
            source_type: "minibar",
            description: "Minibar demo",
            quantity: 1,
            unit_price: 50000,
            total: 50000,
            posted_by: "seed-demo",
            posted_at: createdAt,
          },
        ],
      },
    },
  });
  await prisma.accommodation_rooms.update({
    where: { id: futureRoom.id },
    data: { status: "reserved", updated_at: new Date().toISOString() },
  });
  await prisma.accommodation_reservations.create({
    data: {
      store_id: spec.id,
      reservation_number: "RSV-DEMO-0002",
      status: "confirmed",
      customer_id: built.customers[1]?.id,
      room_type_id: futureRoom.room_type_id,
      room_id: futureRoom.id,
      check_in_date: isoDate(3),
      check_out_date: isoDate(5),
      adults: 2,
      source: "whatsapp",
      rate: 350000,
      created_by: "seed-demo",
      created_at: createdAt,
      updated_at: createdAt,
    },
  });
  await prisma.accommodation_housekeeping_tasks.create({
    data: {
      store_id: spec.id,
      room_id: rooms[2].id,
      task_type: "cleaning",
      status: "pending",
      priority: "normal",
      created_by: "seed-demo",
      created_at: createdAt,
      updated_at: createdAt,
    },
  });

  console.log(
    `  Front office   : ${roomTypes.length} room types, ${rooms.length} rooms, folio ${folio.folio_number}`,
  );
}

// ── Catalog ─────────────────────────────────────────────────────────────────

interface BuiltProduct {
  id: number;
  spec: SeedProduct;
}

async function seedStore(spec: StoreSpec, createdAt: string) {
  await prisma.stores.create({
    data: {
      id: spec.id,
      name: spec.name,
      tier: spec.tier,
      created_at: createdAt,
      updated_at: createdAt,
    },
  });

  // ── Users ────────────────────────────────────────────────────────────────
  const users: Record<string, { id: number; email: string }> = {};
  for (const u of spec.users) {
    const created = await prisma.users.create({
      data: {
        email: u.email,
        password_hash: await bcrypt.hash(u.password, 10),
        role: u.role,
        store_id: spec.id,
        created_at: createdAt,
        updated_at: createdAt,
      },
    });
    users[u.role] = { id: created.id, email: created.email };
  }

  // ── Settings (keys are namespaced "{storeId}:{key}" by StoresService) ────
  const settings: Record<string, string> = {
    ...spec.settings,
    businessType: spec.businessType,
    businessPreset: spec.preset,
    businessVertical: spec.vertical,
  };
  if (spec.taxRate > 0) {
    settings["calc.tax_rate"] = String(spec.taxRate);
    settings["calc.tax_mode"] = spec.taxMode;
  }
  if (spec.serviceChargeRate > 0) {
    settings["calc.service_charge_rate"] = String(spec.serviceChargeRate);
  }
  for (const [key, value] of Object.entries(settings)) {
    await prisma.store_settings.create({
      data: { key: `${spec.id}:${key}`, value, updated_at: createdAt },
    });
  }

  await prisma.store_business_profiles.create({
    data: {
      store_id: spec.id,
      requested_business_vertical: spec.vertical,
      verified_business_vertical: spec.vertical,
      verification_status: "verified",
      verified_by: "seed-demo",
      verified_at: createdAt,
      notes: "Demo tenant seeded by prisma/seed-demo.ts",
      created_at: createdAt,
      updated_at: createdAt,
    } as any,
  });

  for (const moduleKey of spec.disabledModules) {
    await prisma.store_module_overrides.create({
      data: {
        store_id: spec.id,
        module_key: moduleKey,
        enabled: false,
        reason:
          "Placeholder page with no backend (ea22c11). Override needed because " +
          "getCapabilities() falls back to the business_vertical_modules catalog " +
          "when the preset module list is empty.",
        updated_by: "seed-demo",
        updated_at: createdAt,
      },
    });
  }

  // ── Categories ───────────────────────────────────────────────────────────
  const categoryIds: Record<string, number> = {};
  for (const c of spec.categories) {
    const row = await prisma.product_categories.create({
      data: {
        name: c.name,
        slug: c.slug,
        sort_order: c.sort,
        is_active: true,
        store_id: spec.id,
        created_at: createdAt,
        updated_at: createdAt,
      },
    });
    categoryIds[c.slug] = row.id;
  }

  // ── Products ─────────────────────────────────────────────────────────────
  const location = await prisma.inventory_locations.create({
    data: {
      store_id: spec.id,
      name: "Gudang Utama",
      type: "warehouse",
      is_default: true,
      is_active: true,
      created_at: createdAt,
    },
  });

  const products: Record<string, BuiltProduct> = {};
  for (const p of spec.products) {
    const tracked = p.tracked ?? false;
    const row = await prisma.menu.create({
      data: {
        name: p.name,
        price: p.price,
        cost_price: p.cost,
        stock: tracked ? (p.stock ?? 0) : 0,
        description: p.description ?? null,
        store_id: spec.id,
        sku: p.sku,
        product_type: p.type ?? "simple",
        unit_name: p.unitName ?? null,
        unit_code: p.unitCode ?? null,
        is_stock_tracked: tracked,
        is_active: true,
        category_id: categoryIds[p.category],
      },
    });
    products[p.key] = { id: row.id, spec: p };

    if (tracked) {
      await prisma.inventory_stock_balances.create({
        data: {
          menu_id: row.id,
          location_id: location.id,
          qty_on_hand: p.stock ?? 0,
          qty_reserved: 0,
          updated_at: createdAt,
        },
      });
      await prisma.stock_change_logs.create({
        data: {
          menu_id: row.id,
          change_type: "restock",
          qty_before: 0,
          qty_change: p.stock ?? 0,
          qty_after: p.stock ?? 0,
          note: "Stok awal demo",
          store_id: spec.id,
          operator_id: String(users.owner.id),
          location_id: location.id,
          created_at: createdAt,
        },
      });
    }
  }

  // ── Modifiers ────────────────────────────────────────────────────────────
  for (const [index, g] of spec.modifierGroups.entries()) {
    const group = await prisma.modifier_groups.create({
      data: {
        store_id: spec.id,
        name: g.name,
        selection_type: g.selectionType,
        is_required: g.required,
        min_select: g.minSelect,
        max_select: g.maxSelect,
        sort_order: index + 1,
        is_active: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
    });
    for (const [optIndex, opt] of g.options.entries()) {
      await prisma.modifier_options.create({
        data: {
          group_id: group.id,
          name: opt.name,
          price_delta: opt.delta,
          sort_order: optIndex + 1,
          is_active: true,
          created_at: createdAt,
        },
      });
    }
    const targets = spec.products.filter((p) =>
      g.appliesTo.includes(p.category),
    );
    for (const target of targets) {
      if (target.key === "air-mineral") continue; // bottled water takes no modifiers
      await prisma.product_modifier_links.create({
        data: {
          menu_id: products[target.key].id,
          group_id: group.id,
          sort_order: index + 1,
          created_at: createdAt,
        },
      });
    }
  }

  // ── Recipes (BOM) ────────────────────────────────────────────────────────
  for (const r of spec.recipes) {
    const recipe = await prisma.recipes.create({
      data: {
        menu_id: products[r.product].id,
        yield_qty: r.yieldQty,
        yield_unit: r.yieldUnit,
        is_active: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
    });
    for (const [i, ing] of r.ingredients.entries()) {
      await prisma.recipe_ingredients.create({
        data: {
          recipe_id: recipe.id,
          ingredient_menu_id: products[ing.material].id,
          qty: ing.qty,
          unit_code: products[ing.material].spec.unitCode ?? null,
          sort_order: i + 1,
          created_at: createdAt,
        },
      });
    }
  }

  // ── Customers ────────────────────────────────────────────────────────────
  const customers: Array<{ id: number; name: string; phone: string }> = [];
  for (const c of spec.customers) {
    const row = await prisma.customers.create({
      data: {
        store_id: spec.id,
        name: c.name,
        phone: c.phone,
        tier: c.tier,
        notes: c.notes ?? null,
        is_active: true,
        created_at: createdAt,
        updated_at: createdAt,
      },
    });
    customers.push({ id: row.id, name: row.name, phone: c.phone });
  }

  return { users, products, customers, locationId: location.id };
}

// ── Transaction history ─────────────────────────────────────────────────────
//
// Writes the same row set a real sale writes (order + items, payments,
// cashflow entry per payment line, receipt sequence, pos_sale + items, stock
// movements) so reports, the shift close screen and the inventory ledger all
// agree with each other.
//
// Two deliberate differences from PosSalesService:
//   - orders.store_id is set. The live POS omits it, so every order it writes
//     lands on "default-store" regardless of who rang it up.
//   - No voids/refunds are generated: pos_corrections needs a matching
//     manager_approvals chain, and a half-built one would read as corrupt
//     data rather than test data.

type SaleStats = { sales: number; revenue: number };

async function seedHistory(
  spec: StoreSpec,
  built: Awaited<ReturnType<typeof seedStore>>,
): Promise<SaleStats> {
  const rng = makeRng(spec.seed);
  const cashierUserId = built.users.cashier.id;
  const cashierId = String(cashierUserId);
  const storeCode =
    spec.id
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 8)
      .toUpperCase() || "STORE";

  const byCategory = (slug: string) =>
    spec.products.filter((p) => p.category === slug);

  const activeHours = spec.hourWeights
    .map((w, h) => ({ hour: h, weight: w }))
    .filter((x) => x.weight > 0);
  const openHour = activeHours[0].hour;
  const closeHour = activeHours[activeHours.length - 1].hour;

  // Running stock per tracked product, so movements and the closing balance
  // line up instead of being written independently.
  const stock = new Map<number, number>();
  const restockAt = new Map<number, number>();
  for (const built_p of Object.values(built.products)) {
    if (!built_p.spec.tracked) continue;
    stock.set(built_p.id, built_p.spec.stock ?? 0);
    restockAt.set(
      built_p.id,
      Math.max(5, Math.ceil((built_p.spec.restockQty ?? 0) * 0.1)),
    );
  }

  /** Deduct from a tracked product, restocking first when it would run dry. */
  async function moveStock(
    menuId: number,
    qty: number,
    at: string,
    orderId: number,
    note: string,
  ) {
    let current = stock.get(menuId);
    if (current === undefined) return;
    const threshold = restockAt.get(menuId) ?? 5;
    const restockQty =
      Object.values(built.products).find((p) => p.id === menuId)?.spec
        .restockQty ?? 0;

    if (current - qty < threshold && restockQty > 0) {
      const before = current;
      current = before + restockQty;
      await prisma.stock_change_logs.create({
        data: {
          menu_id: menuId,
          change_type: "restock",
          qty_before: before,
          qty_change: restockQty,
          qty_after: current,
          note: "Restock rutin",
          store_id: spec.id,
          operator_id: String(built.users.manager.id),
          location_id: built.locationId,
          created_at: at,
        },
      });
    }

    const before = current;
    const after = before - qty;
    await prisma.stock_change_logs.create({
      data: {
        menu_id: menuId,
        order_id: orderId,
        change_type: "sale",
        qty_before: before,
        qty_change: -qty,
        qty_after: after,
        note,
        store_id: spec.id,
        operator_id: cashierId,
        location_id: built.locationId,
        created_at: at,
      },
    });
    stock.set(menuId, after);
  }

  let totalSales = 0;
  let totalRevenue = 0;

  for (let d = HISTORY_DAYS - 1; d >= 0; d--) {
    const day = dayOffset(d);
    const isToday = d === 0;
    const openedAt = isoAt(day, openHour, 0);

    const session = await prisma.cash_register_sessions.create({
      data: {
        store_id: spec.id,
        cashier_id: cashierId,
        status: "open",
        opening_cash: spec.openingCash,
        expected_cash: spec.openingCash,
        opened_at: openedAt,
      },
    });

    const saleCount = randInt(rng, spec.salesPerDay[0], spec.salesPerDay[1]);
    const times: Array<{ hour: number; minute: number }> = [];
    for (let i = 0; i < saleCount; i++) {
      times.push({
        hour: pickWeighted(rng, activeHours, (x) => x.weight).hour,
        minute: randInt(rng, 0, 59),
      });
    }
    times.sort((a, b) => a.hour - b.hour || a.minute - b.minute);

    // Receipt numbers are scoped by UTC business date, exactly as
    // PosSalesService.nextReceiptNumber() does (now.slice(0, 10)).
    const sequences = new Map<string, number>();
    let expectedCash = spec.openingCash;

    for (const t of times) {
      const at = isoAt(day, t.hour, t.minute);

      const lines = spec.composeSale(rng, byCategory);
      const items = lines.map((l) => {
        const unitPrice = round(l.product.price);
        return {
          key: l.product.key,
          productId: built.products[l.product.key].id,
          name: l.product.name,
          qty: l.qty,
          unitPrice,
          lineTotal: round(unitPrice * l.qty),
          tracked: l.product.tracked ?? false,
        };
      });

      const subtotal = round(items.reduce((s, i) => s + i.lineTotal, 0));

      let discountAmount = 0;
      let discountReason: string | null = null;
      if (subtotal >= 30000 && rng() < spec.discountChance) {
        discountAmount = Math.round((subtotal * 0.1) / 1000) * 1000;
        discountReason =
          spec.discountReasons[
            randInt(rng, 0, spec.discountReasons.length - 1)
          ];
      }

      const discountedSubtotal = round(subtotal - discountAmount);
      const taxAmount =
        spec.taxMode === "inclusive"
          ? 0
          : round(discountedSubtotal * spec.taxRate);
      const serviceChargeAmount = round(
        discountedSubtotal * spec.serviceChargeRate,
      );
      const total = round(discountedSubtotal + taxAmount + serviceChargeAmount);

      // ── Payment lines ────────────────────────────────────────────────────
      const paymentLines: Array<{
        method: string;
        amount: number;
        paidAmount: number;
      }> = [];
      if (rng() < spec.splitPaymentChance && total > spec.splitMinTotal) {
        const first = Math.max(Math.floor(total / 2 / 10000) * 10000, 10000);
        const second = round(total - first);
        paymentLines.push({
          method: "Cash",
          amount: first,
          paidAmount: cashTendered(first),
        });
        paymentLines.push({
          method: "QRIS",
          amount: second,
          paidAmount: second,
        });
      } else {
        const method = pickWeighted(rng, spec.payments, (x) => x[1])[0];
        paymentLines.push({
          method,
          amount: total,
          paidAmount: method === "Cash" ? cashTendered(total) : total,
        });
      }
      const paidTotal = round(
        paymentLines.reduce((s, l) => s + l.paidAmount, 0),
      );
      const change = round(Math.max(paidTotal - total, 0));

      const customer =
        built.customers.length > 0 && rng() < spec.customerChance
          ? built.customers[randInt(rng, 0, built.customers.length - 1)]
          : null;
      const orderType = pickWeighted(rng, spec.orderTypes, (x) => x[1])[0];

      // ── Order ────────────────────────────────────────────────────────────
      const order = await prisma.orders.create({
        data: {
          user_id: cashierUserId,
          type: orderType,
          name: customer?.name ?? "Umum",
          phone: customer?.phone ?? "",
          address: "",
          payment_method: paymentLines[0].method,
          status: "confirmed",
          store_id: spec.id,
          customer_id: customer?.id ?? null,
          channel: "in_store",
          created_at: at,
        },
      });

      await prisma.order_items.createMany({
        data: items.map((i) => ({
          order_id: order.id,
          menu_id: i.productId,
          name: i.name,
          price: i.unitPrice,
          qty: i.qty,
        })),
      });

      // ── Payments + cashflow ──────────────────────────────────────────────
      for (const line of paymentLines) {
        await prisma.payments.create({
          data: {
            order_id: order.id,
            store_id: spec.id,
            amount: line.amount,
            paid_amount: line.paidAmount,
            discount: discountAmount,
            tax: taxAmount,
            payment_method: line.method,
            status: "paid",
            completed_at: at,
            created_at: at,
          },
        });
        await prisma.cashflow_entries.create({
          data: {
            session_id: session.id,
            store_id: spec.id,
            entry_type: "income",
            amount: line.amount,
            payment_method: line.method,
            reference_type: "order",
            reference_id: String(order.id),
            category: "pos_sale",
            note:
              line.method === "Cash"
                ? `POS cash sale #${order.id}`
                : `POS non-cash sale #${order.id}`,
            operator_id: cashierId,
            created_at: at,
          },
        });
        if (line.method === "Cash")
          expectedCash = round(expectedCash + line.amount);
      }

      // ── Receipt ──────────────────────────────────────────────────────────
      const businessDate = at.slice(0, 10);
      const sequence = (sequences.get(businessDate) ?? 0) + 1;
      sequences.set(businessDate, sequence);
      const receiptNumber = `R-${storeCode}-${businessDate.replace(/-/g, "")}-${
        session.id
      }-${String(sequence).padStart(4, "0")}`;

      const sale = await prisma.pos_sales.create({
        data: {
          receipt_number: receiptNumber,
          client_sale_id: `demo-${spec.id}-${order.id}`,
          order_id: order.id,
          register_session_id: session.id,
          cashier_id: cashierId,
          store_id: spec.id,
          customer_name: customer?.name ?? null,
          customer_phone: customer?.phone ?? null,
          customer_id: customer?.id ?? null,
          order_type: orderType,
          status: "paid",
          channel: "in_store",
          subtotal,
          discount_amount: discountAmount,
          discount_reason: discountReason,
          tax_amount: taxAmount,
          tax_mode: spec.taxMode,
          service_charge_amount: serviceChargeAmount,
          total,
          paid_total: paidTotal,
          change_amount: change,
          payment_methods: JSON.stringify(paymentLines.map((l) => l.method)),
          payment_lines: JSON.stringify(paymentLines),
          created_at: at,
        },
      });

      await prisma.pos_sale_items.createMany({
        data: items.map((i) => ({
          sale_id: sale.id,
          product_id: i.productId,
          name: i.name,
          qty: i.qty,
          unit_price: i.unitPrice,
          line_total: i.lineTotal,
          created_at: at,
        })),
      });

      // ── Stock: finished goods, then BOM ingredients ──────────────────────
      for (const item of items) {
        if (item.tracked) {
          await moveStock(
            item.productId,
            item.qty,
            at,
            order.id,
            `POS ${receiptNumber}`,
          );
        }
        const recipe = spec.recipes.find((r) => r.product === item.key);
        if (!recipe) continue;
        for (const ing of recipe.ingredients) {
          await moveStock(
            built.products[ing.material].id,
            ing.qty * item.qty,
            at,
            order.id,
            `Bahan baku ${item.name} (${receiptNumber})`,
          );
        }
      }

      totalSales += 1;
      totalRevenue = round(totalRevenue + total);
    }

    for (const [businessDate, sequence] of sequences) {
      await prisma.receipt_sequences.create({
        data: {
          store_id: spec.id,
          register_session_id: session.id,
          business_date: businessDate,
          sequence,
          created_at: openedAt,
          updated_at: openedAt,
        },
      });
    }

    if (isToday) {
      // Today's shift stays open so the till has a live session to sell into.
      await prisma.cash_register_sessions.update({
        where: { id: session.id },
        data: { expected_cash: expectedCash },
      });
    } else {
      // One past shift closes short, so the variance path has something to show.
      const shortfall = d === 5 ? 15000 : 0;
      const countedCash = round(expectedCash - shortfall);
      await prisma.cash_register_sessions.update({
        where: { id: session.id },
        data: {
          status: "closed",
          expected_cash: expectedCash,
          counted_cash: countedCash,
          variance: round(countedCash - expectedCash),
          closed_at: isoAt(day, Math.min(closeHour + 1, 23), 30),
          notes: shortfall ? "Selisih kas, sedang ditelusuri manajer" : null,
        },
      });
    }
  }

  // Final stock lands on both the legacy menu.stock column and the
  // per-location balance, which are read by different screens.
  for (const [menuId, qty] of stock) {
    await prisma.menu.update({ where: { id: menuId }, data: { stock: qty } });
    await prisma.inventory_stock_balances.updateMany({
      where: { menu_id: menuId, location_id: built.locationId },
      data: { qty_on_hand: qty, updated_at: new Date().toISOString() },
    });
  }

  return { sales: totalSales, revenue: totalRevenue };
}

// ── Main ────────────────────────────────────────────────────────────────────

const rupiah = (n: number) =>
  "Rp" +
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

async function main() {
  const storeIds = SPECS.map((s) => s.id);
  console.log(`Wiping demo stores: ${storeIds.join(", ")}`);
  await wipeDemoStores(storeIds);

  // Catalog predates the transaction window.
  const createdAt = isoAt(dayOffset(HISTORY_DAYS + 1), 9, 0);

  for (const spec of SPECS) {
    console.log(`\nSeeding ${spec.name} (${spec.id})...`);
    const built = await seedStore(spec, createdAt);
    const stats = await seedHistory(spec, built);
    await seedHotelFrontOffice(spec, built, createdAt);

    console.log(`  Tier          : ${spec.tier}`);
    console.log(`  Preset        : ${spec.preset} / vertical ${spec.vertical}`);
    console.log(
      `  Products      : ${spec.products.length} in ${spec.categories.length} kategori`,
    );
    console.log(`  Customers     : ${spec.customers.length}`);
    console.log(`  Sales         : ${stats.sales} over ${HISTORY_DAYS} days`);
    console.log(`  Revenue       : ${rupiah(stats.revenue)}`);
    for (const u of spec.users) {
      console.log(`  ${u.label.padEnd(12)}: ${u.email} / ${u.password}`);
    }
  }

  console.log("\nNotes:");
  console.log(
    "  - Hotel demo includes room types, rooms, reservations, an active stay,",
  );
  console.log("    an open folio, and a housekeeping task.");
  console.log("  - Today's register session is left OPEN on both stores.");
  console.log(
    "  - No voids/refunds seeded; the correction flow needs manual testing.",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
