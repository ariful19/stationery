import type { SQL } from 'drizzle-orm';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  customerLedgerSchema,
  duesReportSchema,
  duesReportQuerySchema,
  paymentsLedgerEntrySchema,
  paymentsLedgerQuerySchema,
  paymentsLedgerSchema,
  salesReportQuerySchema,
  salesReportSchema,
  type DuesReport,
  type PaymentsLedger,
  type SalesReport
} from '@stationery/shared';
import {
  customerLedgerView,
  customers,
  db,
  invoices,
  payments
} from '../db/client.js';
import { toIsoDateTime } from '../utils/datetime.js';

function buildWhereClause(filters: SQL[]) {
  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return and(...(filters as [SQL, SQL, ...SQL[]]));
}

export function getDuesReport(query: unknown = {}): DuesReport {
  const parsed = duesReportQuerySchema.parse(query ?? {});

  const filters: SQL[] = [];

  if (parsed.customerId) {
    filters.push(eq(customerLedgerView.customerId, parsed.customerId));
  }

  if (parsed.minBalanceCents !== undefined) {
    filters.push(sql`${customerLedgerView.balanceCents} >= ${parsed.minBalanceCents}`);
  }

  if (parsed.search) {
    const like = `%${parsed.search.toLowerCase()}%`;
    filters.push(sql`lower(${customerLedgerView.customerName}) LIKE ${like}`);
  }

  const whereClause = buildWhereClause(filters);

  const baseSelection = db.select().from(customerLedgerView);
  const filteredSelection = whereClause
    ? baseSelection.where(whereClause)
    : baseSelection;

  const rows = filteredSelection.orderBy(desc(customerLedgerView.balanceCents)).all();
  const customersData = rows.map(row => customerLedgerSchema.parse(row));

  const summary = customersData.reduce(
    (acc, item) => {
      acc.totalInvoicedCents += item.invoicedCents;
      acc.totalPaidCents += item.paidCents;
      acc.totalBalanceCents += item.balanceCents;
      return acc;
    },
    { totalInvoicedCents: 0, totalPaidCents: 0, totalBalanceCents: 0 }
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    customers: customersData,
    summary: {
      customersCount: customersData.length,
      ...summary
    }
  } satisfies DuesReport;

  return duesReportSchema.parse(payload);
}

export function getSalesReport(query: unknown = {}): SalesReport {
  const parsed = salesReportQuerySchema.parse(query ?? {});

  const filters: SQL[] = [inArrayIssuedStatuses()];

  if (parsed.from) {
    filters.push(sql`datetime(${invoices.issueDate}) >= datetime(${parsed.from} || ' 00:00:00')`);
  }

  if (parsed.to) {
    filters.push(sql`datetime(${invoices.issueDate}) <= datetime(${parsed.to} || ' 23:59:59')`);
  }

  const whereClause = buildWhereClause(filters);

  const strftimeFormat = groupFormats[parsed.groupBy];

  const baseSelection = db
    .select({
      period: sql<string>`strftime(${strftimeFormat}, ${invoices.issueDate})`,
      invoicesCount: sql<number>`count(*)`,
      totalCents: sql<number>`sum(${invoices.grandTotalCents})`
    })
    .from(invoices)
    .groupBy(sql`strftime(${strftimeFormat}, ${invoices.issueDate})`)
    .orderBy(sql`strftime(${strftimeFormat}, ${invoices.issueDate})`);

  const filteredSelection = whereClause
    ? baseSelection.where(whereClause)
    : baseSelection;

  const rows = filteredSelection.all();

  const parsedRows = rows.map(row => ({
    period: row.period,
    invoicesCount: row.invoicesCount ?? 0,
    totalCents: row.totalCents ?? 0
  }));

  const summary = parsedRows.reduce(
    (acc, item) => {
      acc.totalInvoicesCount += item.invoicesCount;
      acc.totalCents += item.totalCents;
      return acc;
    },
    { totalInvoicesCount: 0, totalCents: 0 }
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    rows: parsedRows,
    summary
  } satisfies SalesReport;

  return salesReportSchema.parse(payload);
}

const groupFormats = {
  day: '%Y-%m-%d',
  week: '%Y-%W',
  month: '%Y-%m'
} as const;

function inArrayIssuedStatuses(): SQL {
  return sql`${invoices.status} IN ('issued', 'partial', 'paid')`;
}

export function getPaymentsLedger(query: unknown = {}): PaymentsLedger {
  const parsed = paymentsLedgerQuerySchema.parse(query ?? {});

  const filters: SQL[] = [];

  if (parsed.customerId) {
    filters.push(eq(payments.customerId, parsed.customerId));
  }

  if (parsed.invoiceId) {
    filters.push(eq(payments.invoiceId, parsed.invoiceId));
  }

  if (parsed.from) {
    filters.push(sql`datetime(${payments.paidAt}) >= datetime(${parsed.from} || ' 00:00:00')`);
  }

  if (parsed.to) {
    filters.push(sql`datetime(${payments.paidAt}) <= datetime(${parsed.to} || ' 23:59:59')`);
  }

  const whereClause = buildWhereClause(filters);

  const baseSelection = db
    .select({
      id: payments.id,
      customerId: payments.customerId,
      invoiceId: payments.invoiceId,
      amountCents: payments.amountCents,
      method: payments.method,
      paidAt: payments.paidAt,
      note: payments.note,
      customerName: customers.name,
      invoiceNo: invoices.invoiceNo
    })
    .from(payments)
    .leftJoin(customers, eq(customers.id, payments.customerId))
    .leftJoin(invoices, eq(invoices.id, payments.invoiceId));

  const filteredSelection = whereClause
    ? baseSelection.where(whereClause)
    : baseSelection;

  const orderedSelection =
    parsed.direction === 'asc'
      ? filteredSelection.orderBy(payments.paidAt, payments.id)
      : filteredSelection.orderBy(desc(payments.paidAt), desc(payments.id));

  const rows = orderedSelection.all();

  const chronological = [...rows].sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
  let runningTotal = 0;
  const runningMap = new Map<number, number>();
  chronological.forEach(row => {
    runningTotal += row.amountCents ?? 0;
    runningMap.set(row.id, runningTotal);
  });

  const entries = rows.map(row =>
    paymentsLedgerEntrySchema.parse({
      ...row,
      customerName: row.customerName ?? 'Unknown customer',
      invoiceNo: row.invoiceNo ?? null,
      note: row.note ?? null,
      paidAt: toIsoDateTime(row.paidAt),
      runningBalanceCents: runningMap.get(row.id) ?? row.amountCents ?? 0
    })
  );

  const summary = entries.reduce(
    (acc, entry) => {
      acc.totalPaidCents += entry.amountCents;
      if (!acc.firstPaymentAt || entry.paidAt < acc.firstPaymentAt) {
        acc.firstPaymentAt = entry.paidAt;
      }
      if (!acc.lastPaymentAt || entry.paidAt > acc.lastPaymentAt) {
        acc.lastPaymentAt = entry.paidAt;
      }
      return acc;
    },
    { totalPaidCents: 0, firstPaymentAt: null as string | null, lastPaymentAt: null as string | null }
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    entries,
    summary: {
      entriesCount: entries.length,
      totalPaidCents: summary.totalPaidCents,
      firstPaymentAt: summary.firstPaymentAt,
      lastPaymentAt: summary.lastPaymentAt
    }
  } satisfies PaymentsLedger;

  return paymentsLedgerSchema.parse(payload);
}
