import 'dotenv/config';
import type { Config } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL ?? './stationery.sqlite';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: databaseUrl
  }
} satisfies Config;
