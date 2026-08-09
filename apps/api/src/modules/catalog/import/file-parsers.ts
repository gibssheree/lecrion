// apps/api/src/modules/catalog/import/file-parsers.ts
//
// Dispatches an uploaded file to the right format-specific parser by
// extension. All three formats resolve to the same ParsedGrid shape, so
// everything downstream (mapping, validation, commit) is format-agnostic.

import { BadRequestException } from '@nestjs/common';
import { ParsedGrid } from './import.types';
import { parseSpreadsheet } from './spreadsheet-parser';
import { parseSqliteFile } from './sqlite-parser';

const CSV_EXTENSIONS = ['.csv'];
const XLSX_EXTENSIONS = ['.xlsx'];
const SQLITE_EXTENSIONS = ['.db', '.sqlite', '.sqlite3'];
const REJECTED_XLS = ['.xls'];

export function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

export async function parseUploadedFile(
  buffer: Buffer,
  filename: string,
  sourceOverride?: string,
): Promise<ParsedGrid> {
  const ext = extensionOf(filename);

  if (CSV_EXTENSIONS.includes(ext)) {
    return parseSpreadsheet(buffer, 'csv');
  }
  if (XLSX_EXTENSIONS.includes(ext)) {
    return parseSpreadsheet(buffer, 'xlsx', sourceOverride);
  }
  if (SQLITE_EXTENSIONS.includes(ext)) {
    return parseSqliteFile(buffer, sourceOverride);
  }
  if (REJECTED_XLS.includes(ext)) {
    throw new BadRequestException(
      'Legacy .xls files are not supported — please save as .xlsx or .csv and try again.',
    );
  }

  throw new BadRequestException(
    `Unsupported file type "${ext || filename}". Supported formats: .csv, .xlsx, .db, .sqlite, .sqlite3.`,
  );
}
