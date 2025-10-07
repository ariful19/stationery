import { Router } from 'express';
import type { SQL } from 'drizzle-orm';
import { and, inArray, sql } from 'drizzle-orm';
import {
  customerLedgerSchema,
  duesReportSchema,
  salesReportQuerySchema,
  salesReportSchema
} from '@stationery/shared';
import { db, customerLedgerView, invoices } from '../db/client.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.get(
  '/dues',
  asyncHandler((_req, res) => {
    const ledgerRows = db.select().from(customerLedgerView).all();
    const payload = duesReportSchema.parse({
      generatedAt: new Date().toISOString(),
      customers: ledgerRows.map(row => customerLedgerSchema.parse(row))
    });

    res.json(payload);
  })
);

const groupFormats = {
  day: '%Y-%m-%d',
  week: '%Y-%W',
  month: '%Y-%m'
} as const;

router.get(
  '/sales',
  asyncHandler((req, res) => {
    const query = salesReportQuerySchema.parse(req.query);

    const filters: SQL[] = [inArray(invoices.status, ['issued', 'partial', 'paid'])];

    if (query.from) {
      filters.push(sql`datetime(${invoices.issueDate}) >= datetime(${query.from} || ' 00:00:00')`);
    }

    if (query.to) {
      filters.push(sql`datetime(${invoices.issueDate}) <= datetime(${query.to} || ' 23:59:59')`);
    }

    const whereClause: SQL | undefined =
      filters.length === 0
        ? undefined
        : filters.length === 1
          ? filters[0]
          : and(...(filters as [SQL, SQL, ...SQL[]]));

    const strftimeFormat = groupFormats[query.groupBy];

    const rows = db
      .select({
        period: sql<string>`strftime(${strftimeFormat}, ${invoices.issueDate})`,
        invoicesCount: sql<number>`count(*)`,
        totalCents: sql<number>`sum(${invoices.grandTotalCents})`
      })
      .from(invoices)
      .where(whereClause)
      .groupBy(sql`strftime(${strftimeFormat}, ${invoices.issueDate})`)
      .orderBy(sql`strftime(${strftimeFormat}, ${invoices.issueDate})`)
      .all();

    const payload = salesReportSchema.parse({
      generatedAt: new Date().toISOString(),
      rows: rows.map(row => ({
        period: row.period,
        invoicesCount: row.invoicesCount ?? 0,
        totalCents: row.totalCents ?? 0
      }))
    });

    res.json(payload);
  })
);

export { router as reportsRouter };
