// apps/api/src/modules/catalog/import/column-mapper.ts
//
// Auto-detects which source column corresponds to which product field, from
// a header row alone. Supports Indonesian + English header names. Always
// overridable — this is a convenience default, never the only way in.

import { ColumnMapping, ImportField, IMPORT_FIELDS } from './import.types';

function normalizeHeader(header: string): string {
  return String(header || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');
}

// Checked in this order so required fields (name, price) claim ambiguous
// columns before optional ones do. Each pattern list is tried as an exact
// match first (across all headers), then as a substring match.
const FIELD_SYNONYMS: Record<ImportField, string[]> = {
  name: ['nama', 'namaproduk', 'productname', 'itemname', 'name', 'produk', 'product', 'item', 'judul', 'title'],
  price: ['harga', 'hargajual', 'sellingprice', 'saleprice', 'price', 'jual'],
  costPrice: ['hpp', 'modal', 'hargamodal', 'hargabeli', 'costprice', 'cost', 'buyprice', 'purchaseprice'],
  sku: ['sku', 'kodeproduk', 'kode', 'productcode', 'itemcode', 'code'],
  barcode: ['barcode', 'barkode', 'kodebar', 'ean', 'upc'],
  stock: ['stok', 'stock', 'qty', 'quantity', 'jumlah', 'jumlahstok'],
  category: ['kategori', 'category', 'categoryname', 'jeniskategori', 'kelompok'],
  unit: ['satuan', 'unit', 'uom', 'unitname'],
  description: ['deskripsi', 'description', 'desc', 'keterangan', 'catatan'],
};

/**
 * Auto-detect a column mapping from a header row. Each header can be
 * claimed by at most one field; each field claims at most one header.
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map(normalizeHeader);
  const claimed = new Set<number>();
  const mapping: ColumnMapping = {};

  for (const field of IMPORT_FIELDS) {
    const synonyms = FIELD_SYNONYMS[field];

    // Pass 1: exact match
    let matchIndex = normalized.findIndex(
      (h, i) => !claimed.has(i) && synonyms.includes(h),
    );

    // Pass 2: substring match (header contains a synonym token)
    if (matchIndex === -1) {
      matchIndex = normalized.findIndex(
        (h, i) => !claimed.has(i) && h.length > 0 && synonyms.some((s) => h.includes(s)),
      );
    }

    if (matchIndex !== -1) {
      mapping[field] = matchIndex;
      claimed.add(matchIndex);
    }
  }

  return mapping;
}

/**
 * Score how "product-like" a grid is, for auto-picking the right sheet/table
 * out of several candidates (multi-sheet XLSX, multi-table SQLite dumps).
 * Higher is better. 0 means "don't consider this a viable candidate".
 */
export function scoreGridAsProductSource(
  sourceName: string,
  headers: string[],
  sampleRowCount: number,
): number {
  if (sampleRowCount === 0 || headers.length === 0) return 0;

  const mapping = autoDetectMapping(headers);
  if (mapping.name === undefined || mapping.price === undefined) return 0;

  let score = 10; // has both required fields mapped
  score += Object.keys(mapping).length; // more recognized fields = more confidence

  const normalizedName = normalizeHeader(sourceName);
  if (['menu', 'produk', 'product', 'products', 'items', 'barang'].some((s) => normalizedName.includes(s))) {
    score += 5;
  }

  return score;
}
