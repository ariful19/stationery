import { readdirSync, readFileSync } from 'node:fs';

import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from '../db/schema.js';

export type TestDatabase = ReturnType<typeof createTestDatabase>;

export function createTestDatabase() {
  const sqlite = new Database(':memory:');
  const migrationsDir = new URL('../../drizzle/', import.meta.url);
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const sql = readFileSync(new URL(file, migrationsDir), 'utf8');
    sqlite.exec(sql);
  }

  const db = drizzle(sqlite, { schema });

  return { sqlite, db, ...schema };
}

export function resetTestDatabase(sqlite: BetterSqlite3Database) {
  sqlite.exec(
    [
      'DELETE FROM invoice_items;',
      'DELETE FROM payments;',
      'DELETE FROM invoices;',
      'DELETE FROM products;',
      'DELETE FROM customers;',
    ].join('\n'),
  );
}
