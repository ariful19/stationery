import { Router } from 'express';
import type { SQL } from 'drizzle-orm';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  paymentCreateSchema,
  paymentListQuerySchema,
  paymentListResponseSchema,
  paymentSchema
} from '@stationery/shared';
import { ApiError, createNotFoundError } from '../errors.js';
import { customers, db, invoices, payments } from '../db/client.js';
import { asyncHandler } from '../utils/async-handler.js';
import { toIsoDateTime } from '../utils/datetime.js';

const router = Router();

const normalizePayment = (payment: typeof payments.$inferSelect) =>
  paymentSchema.parse({
    ...payment,
    note: payment.note ?? undefined,
    paidAt: toIsoDateTime(payment.paidAt)
  });

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = paymentCreateSchema.parse(req.body);

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, payload.customerId)
    });

    if (!customer) {
      throw new ApiError(400, 'invalid_customer', 'Customer does not exist');
    }

    if (payload.invoiceId) {
      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, payload.invoiceId)
      });

      if (!invoice) {
        throw new ApiError(400, 'invalid_invoice', 'Invoice does not exist');
      }

      if (invoice.customerId !== payload.customerId) {
        throw new ApiError(400, 'invoice_customer_mismatch', 'Invoice does not belong to the customer');
      }
    }

    const paidAt = payload.paidAt ?? new Date().toISOString();

    const inserted = db
      .insert(payments)
      .values({
        ...payload,
        paidAt,
        note: payload.note ?? null
      })
      .returning()
      .get();

    if (!inserted) {
      throw new ApiError(500, 'insert_failed', 'Failed to record payment');
    }

    const responsePayload = normalizePayment(inserted);
    res.status(201).json(responsePayload);
  })
);

router.get(
  '/',
  asyncHandler((req, res) => {
    const query = paymentListQuerySchema.parse(req.query);

    const filters: SQL[] = [];

    if (query.customerId) {
      filters.push(eq(payments.customerId, query.customerId));
    }

    if (query.invoiceId) {
      filters.push(eq(payments.invoiceId, query.invoiceId));
    }

    if (query.from) {
      filters.push(sql`datetime(${payments.paidAt}) >= datetime(${query.from} || ' 00:00:00')`);
    }

    if (query.to) {
      filters.push(sql`datetime(${payments.paidAt}) <= datetime(${query.to} || ' 23:59:59')`);
    }

    const whereClause: SQL | undefined =
      filters.length === 0
        ? undefined
        : filters.length === 1
          ? filters[0]
          : and(...(filters as [SQL, SQL, ...SQL[]]));

    let selection = db.select().from(payments);
    if (whereClause) {
      selection = selection.where(whereClause);
    }

    selection =
      query.direction === 'asc'
        ? selection.orderBy(payments.paidAt)
        : selection.orderBy(desc(payments.paidAt));

    const rows = selection.limit(query.limit).offset(query.offset).all();

    let countQuery = db.select({ count: sql<number>`count(*)` }).from(payments);
    if (whereClause) {
      countQuery = countQuery.where(whereClause);
    }

    const total = countQuery.get()?.count ?? rows.length;

    const payload = paymentListResponseSchema.parse({
      data: rows.map(normalizePayment),
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset
      }
    });

    res.json(payload);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const parsedId = paymentSchema.shape.id.parse(id);

    const record = await db.query.payments.findFirst({
      where: eq(payments.id, parsedId)
    });

    if (!record) {
      throw createNotFoundError(`Payment ${parsedId} not found`);
    }

    res.json(normalizePayment(record));
  })
);

export { router as paymentsRouter };
