import { Readable } from 'node:stream';

import type { Response } from 'express';

export interface CsvStreamOptions {
  filename: string;
  header: string[];
  rows: (string | number | null | undefined)[][];
}

const UTF8_BOM = '\ufeff';

function escapeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  if (/[\n,]/u.test(stringValue)) {
    return `"${stringValue}"`;
  }
  return stringValue;
}

function formatRow(values: (string | number | null | undefined)[]) {
  return values.map(escapeValue).join(',') + '\r\n';
}

export function streamCsv(res: Response, options: CsvStreamOptions) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${options.filename}"`);

  const lines = [UTF8_BOM + formatRow(options.header), ...options.rows.map(formatRow)];
  Readable.from(lines).pipe(res);
}
