import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const databaseUrl = process.env.DATABASE_URL ?? join(process.cwd(), 'stationery.sqlite');
const databaseDir = dirname(databaseUrl);

mkdirSync(databaseDir, { recursive: true });

export const sqlite = new Database(databaseUrl);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite);

export * from './schema.js';
