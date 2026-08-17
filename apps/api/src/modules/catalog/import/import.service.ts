// apps/api/src/modules/catalog/import/import.service.ts
//
// One pipeline for both preview and commit: parse -> map columns -> validate
// -> (optionally) write. Preview and commit call the exact same code path
// (only the final write step is conditional on `commit`), so what a user
// sees in the preview can never drift from what actually gets written.

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { ProductType } from '@libs/contracts/src/enums';
import { CatalogService } from '../catalog.service';
import { CategoriesService } from '../categories.service';
import { AuditService } from '../../audit/audit.service';
import { parseUploadedFile } from './file-parsers';
import { autoDetectMapping } from './column-mapper';
import { ColumnMapping, ImportField, ImportPreview, ImportRowResult } from './import.types';

const BATCH_SIZE = 200;
const TRANSACTION_TIMEOUT_MS = 30_000;

export interface RunImportParams {
  buffer: Buffer;
  filename: string;
  sourceOverride?: string;
  mapping?: ColumnMapping;
  commit: boolean;
  storeId: string;
  actor: string;
}

/**
 * Parses a spreadsheet-cell number that may be in Indonesian ("15.000,50")
 * or international ("15,000.50") locale formatting, or plain ("15000").
 * Ambiguous single-separator cases ("15.000") are treated as thousands
 * grouping when followed by exactly 3 digits — correct for the overwhelming
 * majority of Rupiah prices, which don't carry fractional subunits.
 */
export function parseLocaleNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.trim().replace(/[^\d.,-]/g, '');
  if (!s) return null;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (hasComma || hasDot) {
    const sep = hasComma ? ',' : '.';
    const parts = s.split(sep);
    if (parts.length > 2) {
      s = parts.join(''); // repeated separator = thousands grouping
    } else {
      const fractionLen = parts[1]?.length ?? 0;
      s = fractionLen === 3 ? parts.join('') : parts.join('.');
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly categories: CategoriesService,
    private readonly audit: AuditService,
  ) {}

  async run(params: RunImportParams): Promise<ImportPreview> {
    const grid = await parseUploadedFile(params.buffer, params.filename, params.sourceOverride);

    if (grid.headers.length === 0 || grid.rows.length === 0) {
      throw new BadRequestException('No data rows found in the file.');
    }

    const mapping =
      params.mapping && Object.keys(params.mapping).length > 0
        ? params.mapping
        : autoDetectMapping(grid.headers);

    const base = {
      sourceFormat: grid.sourceFormat,
      sourceName: grid.sourceName,
      alternateSources: grid.alternateSources,
      headers: grid.headers,
      mapping,
    };

    if (mapping.name === undefined || mapping.price === undefined) {
      // Structural problem, not a per-row one — let the frontend render the
      // mapping picker instead of a wall of identical row errors.
      return {
        ...base,
        totalRows: grid.rows.length,
        okCount: 0,
        warningCount: 0,
        errorCount: 0,
        rows: [],
        committed: false,
      };
    }

    const rows = this.projectAndValidateRows(grid.rows, mapping);
    await this.resolveMatchesAndCategories(rows, params.storeId);

    const preview: ImportPreview = {
      ...base,
      totalRows: grid.rows.length,
      okCount: rows.filter((r) => r.status === 'ok').length,
      warningCount: rows.filter((r) => r.status === 'warning').length,
      errorCount: rows.filter((r) => r.status === 'error').length,
      rows,
      committed: false,
    };

    if (params.commit) {
      preview.result = await this.commitRows(rows, params.storeId, params.actor);
      preview.committed = true;
    }

    return preview;
  }

  // ── Projection + validation ────────────────────────────────────────────

  private readValue(row: string[], mapping: ColumnMapping, field: ImportField): string | undefined {
    const idx = mapping[field];
    if (idx === undefined) return undefined;
    const v = row[idx];
    return v === undefined ? undefined : v.trim();
  }

  private projectAndValidateRows(rows: string[][], mapping: ColumnMapping): ImportRowResult[] {
    const seenSkus = new Set<string>();
    const seenBarcodes = new Set<string>();

    return rows.map((row, i) => {
      const priceRaw = this.readValue(row, mapping, 'price');
      const costPriceRaw = this.readValue(row, mapping, 'costPrice');
      const stockRaw = this.readValue(row, mapping, 'stock');

      const data = {
        name: this.readValue(row, mapping, 'name') ?? '',
        price: parseLocaleNumber(priceRaw),
        costPrice: costPriceRaw ? parseLocaleNumber(costPriceRaw) : null,
        stock: stockRaw ? parseLocaleNumber(stockRaw) : null,
        sku: this.readValue(row, mapping, 'sku') || null,
        barcode: this.readValue(row, mapping, 'barcode') || null,
        categoryName: this.readValue(row, mapping, 'category') || null,
        unit: this.readValue(row, mapping, 'unit') || null,
        description: this.readValue(row, mapping, 'description') || null,
      };

      const result: ImportRowResult = {
        rowIndex: i + 2, // header occupies row 1
        status: 'ok',
        messages: [],
        action: 'create',
        data,
      };

      const problems = this.catalog.validateProductInput({
        name: data.name,
        price: data.price ?? undefined,
        costPrice: data.costPrice ?? undefined,
        stock: data.stock ?? undefined,
        sku: data.sku ?? undefined,
        barcode: data.barcode ?? undefined,
      });
      if (priceRaw && data.price === null) problems.push('price could not be read as a number');
      if (costPriceRaw && data.costPrice === null) problems.push('costPrice could not be read as a number');
      if (stockRaw && data.stock === null) problems.push('stock could not be read as a number');

      if (problems.length) {
        return { ...result, status: 'error', messages: problems, action: 'skip' };
      }

      if (data.sku) {
        const key = data.sku.toLowerCase();
        if (seenSkus.has(key)) {
          return {
            ...result,
            status: 'error',
            action: 'skip',
            messages: [`Duplicate SKU "${data.sku}" elsewhere in this file — only the first occurrence is kept`],
          };
        }
        seenSkus.add(key);
      }
      if (data.barcode) {
        const key = data.barcode.toLowerCase();
        if (seenBarcodes.has(key)) {
          return {
            ...result,
            status: 'error',
            action: 'skip',
            messages: [`Duplicate barcode "${data.barcode}" elsewhere in this file — only the first occurrence is kept`],
          };
        }
        seenBarcodes.add(key);
      }

      if (!data.sku && !data.barcode) {
        result.status = 'warning';
        result.messages.push('No SKU/barcode on this row — re-importing this file later will create a duplicate instead of updating it');
      }

      return result;
    });
  }

  private async resolveMatchesAndCategories(rows: ImportRowResult[], storeId: string): Promise<void> {
    const writable = rows.filter((r) => r.action !== 'skip');
    const skus = [...new Set(writable.map((r) => r.data.sku).filter((v): v is string => !!v))];
    const barcodes = [...new Set(writable.map((r) => r.data.barcode).filter((v): v is string => !!v))];

    // Prisma treats `{ in: [] }` as an always-empty match, so it's simpler
    // (and avoids a TS empty-array inference quirk) to always query.
    // Scoped by store_id: an unscoped match here would let a bulk import for
    // one store silently overwrite another store's product on a coincidental
    // SKU/barcode collision (SEC-05).
    const [existingBySku, existingByBarcode, existingCategories] = await Promise.all([
      this.prisma.menu.findMany({ where: { sku: { in: skus }, store_id: storeId } }),
      this.prisma.menu.findMany({ where: { barcode: { in: barcodes }, store_id: storeId } }),
      this.categories.getFlat(storeId, true),
    ]);

    const skuMap = new Map(existingBySku.filter((m) => m.sku).map((m) => [m.sku as string, m]));
    const barcodeMap = new Map(existingByBarcode.filter((m) => m.barcode).map((m) => [m.barcode as string, m]));
    const categoryByName = new Map(existingCategories.map((c) => [c.name.trim().toLowerCase(), c]));

    for (const row of writable) {
      const matched =
        (row.data.sku && skuMap.get(row.data.sku)) || (row.data.barcode && barcodeMap.get(row.data.barcode));
      if (matched) {
        row.action = 'update';
        row.matchedProductId = matched.id;
      } else {
        row.action = 'create';
      }

      if (row.data.categoryName && !categoryByName.has(row.data.categoryName.trim().toLowerCase())) {
        if (row.status === 'ok') row.status = 'warning';
        row.messages.push(`Category "${row.data.categoryName}" does not exist yet — will be created`);
      }
    }
  }

  // ── Commit ──────────────────────────────────────────────────────────────

  private async commitRows(
    rows: ImportRowResult[],
    storeId: string,
    actor: string,
  ): Promise<NonNullable<ImportPreview['result']>> {
    const writable = rows.filter((r) => r.action !== 'skip');
    const categoryIdByName = await this.resolveOrCreateCategories(writable, storeId);

    let created = 0;
    let updated = 0;
    let failed = 0;
    const failures: Array<{ rowIndex: number; message: string }> = [];

    for (let i = 0; i < writable.length; i += BATCH_SIZE) {
      const batch = writable.slice(i, i + BATCH_SIZE);
      try {
        const batchCounts = await this.prisma.$transaction(
          async (tx) => {
            let batchCreated = 0;
            let batchUpdated = 0;
            for (const row of batch) {
              const categoryId = row.data.categoryName
                ? (categoryIdByName.get(row.data.categoryName.trim().toLowerCase()) ?? null)
                : null;

              const data = {
                name: row.data.name,
                price: row.data.price as number,
                cost_price: row.data.costPrice,
                stock: row.data.stock ?? 0,
                description: row.data.description,
                sku: row.data.sku,
                barcode: row.data.barcode,
                unit_name: row.data.unit,
                category_id: categoryId,
              };

              if (row.action === 'update' && row.matchedProductId) {
                // matchedProductId came from a store_id-scoped lookup above,
                // so this row is already confirmed to belong to `storeId`.
                await tx.menu.update({ where: { id: row.matchedProductId }, data });
                batchUpdated++;
              } else {
                await tx.menu.create({
                  data: {
                    ...data,
                    store_id: storeId,
                    product_type: ProductType.SIMPLE,
                    is_stock_tracked: true,
                    is_active: true,
                  },
                });
                batchCreated++;
              }
            }
            return { batchCreated, batchUpdated };
          },
          { timeout: TRANSACTION_TIMEOUT_MS },
        );
        created += batchCounts.batchCreated;
        updated += batchCounts.batchUpdated;
      } catch (err) {
        failed += batch.length;
        const message = err instanceof Error ? err.message : 'Unknown error';
        for (const row of batch) {
          failures.push({ rowIndex: row.rowIndex, message: `Batch write failed: ${message}` });
        }
      }
    }

    this.audit.record({
      actor,
      action: 'product.import.committed',
      resource: 'menu',
      after: { created, updated, failed, skipped: rows.length - writable.length, totalRows: rows.length },
      storeId,
      channel: 'dashboard',
    });

    return { created, updated, skipped: rows.length - writable.length, failed, failures };
  }

  /** Resolves category names to IDs, creating any that don't exist yet. */
  private async resolveOrCreateCategories(
    rows: ImportRowResult[],
    storeId: string,
  ): Promise<Map<string, number>> {
    const neededNames = [
      ...new Set(rows.map((r) => r.data.categoryName).filter((v): v is string => !!v)),
    ];
    const byName = new Map<string, number>();
    if (neededNames.length === 0) return byName;

    const existing = await this.categories.getFlat(storeId, true);
    for (const c of existing) byName.set(c.name.trim().toLowerCase(), c.id);

    for (const name of neededNames) {
      const key = name.trim().toLowerCase();
      if (byName.has(key)) continue;
      try {
        const createdCategory = await this.categories.create({ name, storeId });
        byName.set(key, createdCategory.id);
      } catch {
        // Concurrent import created the same slug first — use what exists now.
        const refetched = await this.categories.getFlat(storeId, true);
        const found = refetched.find((c) => c.name.trim().toLowerCase() === key);
        if (found) byName.set(key, found.id);
      }
    }

    return byName;
  }
}
