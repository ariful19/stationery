import Database from 'better-sqlite3';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async function globalSetup() {
  const databaseUrl = process.env.PLAYWRIGHT_DATABASE_URL ?? join(process.cwd(), 'tmp', 'playwright-api.sqlite');
  process.env.DATABASE_URL = databaseUrl;

  [databaseUrl, `${databaseUrl}-wal`, `${databaseUrl}-shm`].forEach(file => {
    rmSync(file, { force: true });
  });
  mkdirSync(dirname(databaseUrl), { recursive: true });

  const sqlite = new Database(databaseUrl);
  const migrationsDir = new URL('../drizzle/', import.meta.url);
  const migrationFiles = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const sql = readFileSync(new URL(file, migrationsDir), 'utf8');
    sqlite.exec(sql);
  }

  sqlite.close();
}
