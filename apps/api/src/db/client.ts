import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { healthChecks } from './schema.js';

const sqlite = new Database(':memory:');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS health_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite);
export { healthChecks };
