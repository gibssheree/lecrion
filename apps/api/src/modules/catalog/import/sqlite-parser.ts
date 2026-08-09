// apps/api/src/modules/catalog/import/sqlite-parser.ts
//
// Parses an uploaded SQLite (.db/.sqlite/.sqlite3) file. better-sqlite3
// only opens real files, not in-memory buffers, so the upload is written to
// a throwaway temp file (read-only) and always cleaned up afterward —
// including on every error path.

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { ParsedGrid } from './import.types';
import { scoreGridAsProductSource } from './column-mapper';

const MAX_ROWS = 10_000;
const SAMPLE_ROWS_FOR_SCORING = 5;

interface TableInfo {
  name: string;
  columns: string[];
}

function listTables(db: Database.Database): TableInfo[] {
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'`,
    )
    .all() as Array<{ name: string }>;

  return tables.map((t) => {
    const columns = (db.pragma(`table_info(${quoteIdent(t.name)})`) as Array<{ name: string }>).map(
      (c) => c.name,
    );
    return { name: t.name, columns };
  });
}

function quoteIdent(identifier: string): string {
  // SQLite identifier quoting — doubles embedded quotes, wraps in double-quotes.
  return `"${identifier.replace(/"/g, '""')}"`;
}

function readTableGrid(
  db: Database.Database,
  table: TableInfo,
  limit: number,
): { headers: string[]; rows: string[][] } {
  const cols = table.columns.map(quoteIdent).join(', ');
  const stmt = db.prepare(`SELECT ${cols} FROM ${quoteIdent(table.name)} LIMIT ?`);
  const records = stmt.all(limit) as Array<Record<string, unknown>>;
  const rows = records.map((record) =>
    table.columns.map((col) => {
      const v = record[col];
      if (v === null || v === undefined) return '';
      if (Buffer.isBuffer(v)) return '';
      return String(v);
    }),
  );
  return { headers: table.columns, rows };
}

export async function parseSqliteFile(
  buffer: Buffer,
  tableOverride?: string,
): Promise<ParsedGrid> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lecrion-import-'));
  const tempPath = path.join(tempDir, `${crypto.randomBytes(8).toString('hex')}.db`);

  try {
    fs.writeFileSync(tempPath, buffer);

    let db: Database.Database;
    try {
      db = new Database(tempPath, { readonly: true, fileMustExist: true });
    } catch {
      throw new BadRequestException(
        'Could not open this file as a SQLite database — it may be corrupted or not a real .db file.',
      );
    }

    try {
      const tables = listTables(db).filter((t) => t.columns.length > 0);
      if (tables.length === 0) {
        throw new BadRequestException('This SQLite file has no tables with data.');
      }

      let chosen: TableInfo;
      if (tableOverride) {
        const found = tables.find((t) => t.name === tableOverride);
        if (!found) {
          throw new BadRequestException(`Table "${tableOverride}" was not found in this file.`);
        }
        chosen = found;
      } else if (tables.length === 1) {
        chosen = tables[0];
      } else {
        const scored = tables.map((t) => {
          const rowCount = (
            db.prepare(`SELECT COUNT(*) as n FROM ${quoteIdent(t.name)}`).get() as { n: number }
          ).n;
          if (rowCount === 0) return { table: t, score: 0 };
          const sample = readTableGrid(db, t, SAMPLE_ROWS_FOR_SCORING);
          return { table: t, score: scoreGridAsProductSource(t.name, sample.headers, sample.rows.length) };
        });
        scored.sort((a, b) => b.score - a.score);
        if (scored[0].score === 0) {
          throw new BadRequestException(
            `Couldn't automatically tell which of the ${tables.length} tables holds product data. ` +
              `Available tables: ${tables.map((t) => t.name).join(', ')}. Please specify one.`,
          );
        }
        chosen = scored[0].table;
      }

      const rowCount = (
        db.prepare(`SELECT COUNT(*) as n FROM ${quoteIdent(chosen.name)}`).get() as { n: number }
      ).n;
      if (rowCount > MAX_ROWS) {
        throw new BadRequestException(
          `Table "${chosen.name}" has ${rowCount} rows — the maximum supported is ${MAX_ROWS}.`,
        );
      }

      const { headers, rows } = readTableGrid(db, chosen, MAX_ROWS);

      return {
        headers,
        rows,
        sourceFormat: 'sqlite',
        sourceName: chosen.name,
        alternateSources: tables.length > 1 ? tables.map((t) => t.name) : undefined,
      };
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
