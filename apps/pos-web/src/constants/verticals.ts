// apps/pos-web/src/constants/verticals.ts
//
// Single source of truth for business verticals across the entire app.
// Used in:
//   - Register flow (Profil Bisnis step)
//   - Settings → Konfigurasi Toko
//   - Support → Verifikasi business profile
//   - PosLayout sidebar (vertical label)
//
// IMPORTANT: keys must exactly match the backend BusinessVertical enum
// in libs/contracts/src/modules/index.ts — the backend stores these canonical
// values in verified_business_vertical and returns them on reload.

export interface BusinessVerticalDef {
  key: string;
  label: string;
  tagline: string;
}

// 5 active verticals — canonical keys that match the backend enum exactly.
// Other verticals exist in the backend but are not yet exposed in the UI.
export const BUSINESS_VERTICALS: BusinessVerticalDef[] = [
  { key: "general",                label: "General / Umum",       tagline: "Bisnis umum / campuran"           },
  { key: "restaurant_cafe",        label: "Restoran / Cafe",       tagline: "Meja, dapur, dine-in & delivery"  },
  { key: "retail",                 label: "Retail Store",          tagline: "Barcode, varian produk, kasir"    },
  { key: "accommodation_hotel",    label: "Akomodasi / Hotel",     tagline: "Kamar, check-in, layanan tamu"    },
  { key: "construction_materials", label: "Toko Bangunan",         tagline: "Material, satuan, proyek"         },
];

/** Quick lookup: label by canonical key. Falls back to the key itself. */
export const VERTICAL_LABELS: Record<string, string> = {
  ...Object.fromEntries(BUSINESS_VERTICALS.map((v) => [v.key, v.label])),
  // Legacy preset aliases stored in old rows
  restaurant:         "Restoran",
  cafe:               "Cafe",
  retail_store:       "Retail Store",
  accommodation:      "Akomodasi / Hotel",
  building_materials: "Toko Bangunan",
};

export function verticalLabel(key?: string | null): string {
  if (!key) return "General";
  return VERTICAL_LABELS[key] ?? key;
}
