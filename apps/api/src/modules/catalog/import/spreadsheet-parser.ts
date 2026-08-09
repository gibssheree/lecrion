// apps/api/src/modules/catalog/import/spreadsheet-parser.ts
//
// CSV and XLSX parsing via exceljs (both formats share one reader — CSV is
// loaded as a single-sheet workbook). We intentionally do NOT use the npm
// `xlsx` (SheetJS) package here: published npm versions carry known
// ReDoS/prototype-pollution advisories with no npm-published fix at time of
// writing. exceljs has no comparable open advisory and is equally capable
// for reading.

import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { BadRequestException } from '@nestjs/common';
import { ParsedGrid } from './import.types';
import { scoreGridAsProductSource } from './column-mapper';

const MAX_ROWS = 10_000;

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (Array.isArray((v as any).richText)) {
      return (v as any).richText.map((run: any) => run.text ?? '').join('');
    }
    if ('result' in v) return v.result === null || v.result === undefined ? '' : String(v.result);
    if ('text' in v) return String(v.text ?? '');
    if ('error' in v) return '';
    return '';
  }
  return String(value);
}

function worksheetToGrid(worksheet: ExcelJS.Worksheet): { headers: string[]; rows: string[][] } {
  const allRows: string[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    // ExcelJS rows are 1-indexed and sparse — walk by cellCount to preserve column order.
    for (let col = 1; col <= row.cellCount; col++) {
      cells.push(cellToString(row.getCell(col).value));
    }
    allRows.push(cells);
  });

  if (allRows.length === 0) return { headers: [], rows: [] };

  const [headerRow, ...dataRows] = allRows;
  const headers = headerRow.map((h) => h.trim());
  // Drop fully-blank rows (common trailing artifact in exported spreadsheets).
  const rows = dataRows.filter((r) => r.some((cell) => cell.trim() !== ''));

  return { headers, rows };
}

export async function parseSpreadsheet(
  buffer: Buffer,
  format: 'csv' | 'xlsx',
  sheetOverride?: string,
): Promise<ParsedGrid> {
  const workbook = new ExcelJS.Workbook();

  try {
    if (format === 'csv') {
      const worksheet = await workbook.csv.read(Readable.from(buffer));
      const { headers, rows } = worksheetToGrid(worksheet);
      if (rows.length > MAX_ROWS) {
        throw new BadRequestException(
          `File has ${rows.length} rows — the maximum supported is ${MAX_ROWS}. Split the file and import in batches.`,
        );
      }
      return { headers, rows, sourceFormat: 'csv', sourceName: 'CSV' };
    }

    await workbook.xlsx.load(buffer as any);
  } catch (err) {
    if (err instanceof BadRequestException) throw err;
    throw new BadRequestException(
      `Could not read this file as ${format.toUpperCase()} — it may be corrupted or not a real ${format} file.`,
    );
  }

  const sheets = workbook.worksheets.filter((ws) => ws.rowCount > 0);
  if (sheets.length === 0) {
    throw new BadRequestException('The spreadsheet has no data on any sheet.');
  }

  let chosen: ExcelJS.Worksheet;
  if (sheetOverride) {
    const found = sheets.find((ws) => ws.name === sheetOverride);
    if (!found) {
      throw new BadRequestException(`Sheet "${sheetOverride}" was not found in this file.`);
    }
    chosen = found;
  } else if (sheets.length === 1) {
    chosen = sheets[0];
  } else {
    // Multiple sheets — score each and auto-pick the most product-like one.
    const scored = sheets.map((ws) => {
      const { headers, rows } = worksheetToGrid(ws);
      return { ws, score: scoreGridAsProductSource(ws.name, headers, rows.length) };
    });
    scored.sort((a, b) => b.score - a.score);
    if (scored[0].score === 0) {
      throw new BadRequestException(
        `Couldn't automatically tell which of the ${sheets.length} sheets holds product data. ` +
          `Available sheets: ${sheets.map((s) => s.name).join(', ')}. Please specify one.`,
      );
    }
    chosen = scored[0].ws;
  }

  const { headers, rows } = worksheetToGrid(chosen);
  if (rows.length > MAX_ROWS) {
    throw new BadRequestException(
      `Sheet "${chosen.name}" has ${rows.length} rows — the maximum supported is ${MAX_ROWS}. Split the file and import in batches.`,
    );
  }

  return {
    headers,
    rows,
    sourceFormat: 'xlsx',
    sourceName: chosen.name,
    alternateSources: sheets.length > 1 ? sheets.map((s) => s.name) : undefined,
  };
}
