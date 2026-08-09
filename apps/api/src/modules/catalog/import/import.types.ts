// apps/api/src/modules/catalog/import/import.types.ts
//
// Shared types for the product import pipeline (CSV / XLSX / SQLite .db).
// One pipeline, one set of types — the preview and commit passes both
// produce/consume these shapes so they can never disagree on meaning.

/** Target product fields a source column can be mapped to. */
export const IMPORT_FIELDS = [
  'name',
  'price',
  'costPrice',
  'stock',
  'sku',
  'barcode',
  'category',
  'unit',
  'description',
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Column index (into a row array) for each target field, or null if unmapped. */
export type ColumnMapping = Partial<Record<ImportField, number>>;

/** A raw, un-interpreted grid extracted from any source format. */
export interface ParsedGrid {
  headers: string[];
  rows: string[][];
  sourceFormat: 'csv' | 'xlsx' | 'sqlite';
  /** Sheet name (xlsx) or table name (sqlite) this grid came from. */
  sourceName: string;
  /** Other candidate sheets/tables found in the file, if any (for manual override). */
  alternateSources?: string[];
}

export type RowStatus = 'ok' | 'warning' | 'error';

export interface ImportRowResult {
  rowIndex: number; // 1-based, matches spreadsheet row numbering (header = row 1)
  status: RowStatus;
  messages: string[];
  action: 'create' | 'update' | 'skip';
  data: {
    name: string;
    price: number | null;
    costPrice: number | null;
    stock: number | null;
    sku: string | null;
    barcode: string | null;
    categoryName: string | null;
    unit: string | null;
    description: string | null;
  };
  matchedProductId?: number;
}

export interface ImportPreview {
  sourceFormat: ParsedGrid['sourceFormat'];
  sourceName: string;
  alternateSources?: string[];
  headers: string[];
  mapping: ColumnMapping;
  totalRows: number;
  okCount: number;
  warningCount: number;
  errorCount: number;
  rows: ImportRowResult[];
  committed: boolean;
  result?: {
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    failures: Array<{ rowIndex: number; message: string }>;
  };
}
