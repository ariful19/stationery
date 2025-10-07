# Database Verification Guide

These steps make it easy to assert that the SQLite schema, write-ahead logging, and seed data are in place. They are designed so future automation can copy/paste the commands verbatim.

## 1. Apply the schema

```bash
pnpm --filter @stationery/api db:push
```

This command runs Drizzle's schema push and recreates the `customer_ledger` view.

## 2. Seed reference data

```bash
pnpm --filter @stationery/api db:seed
```

The script truncates dependent tables (invoices, items, payments) before inserting 20 customers and 30 products.

## 3. Confirm WAL mode

```bash
pnpm --filter @stationery/api exec sqlite3 stationery.sqlite "PRAGMA journal_mode;"
```

The output should be `wal`.

## 4. Validate seed counts

```bash
pnpm --filter @stationery/api exec sqlite3 stationery.sqlite "SELECT COUNT(*) FROM customers;"
pnpm --filter @stationery/api exec sqlite3 stationery.sqlite "SELECT COUNT(*) FROM products;"
```

Expect `20` customers and `30` products.

## 5. Check the customer ledger view

```bash
pnpm --filter @stationery/api exec sqlite3 stationery.sqlite "SELECT name FROM sqlite_master WHERE type='view';"
pnpm --filter @stationery/api exec sqlite3 stationery.sqlite "SELECT * FROM customer_ledger LIMIT 3;"
```

The first command should list `customer_ledger`. The second shows derived balances for seeded customers (initially `0`).
