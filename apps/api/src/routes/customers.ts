import { Router } from 'express';
import { desc, eq, like, or, sql } from 'drizzle-orm';
import {
  customerCreateSchema,
  customerLedgerSchema,
  customerListQuerySchema,
  customerListResponseSchema,
  customerSchema,
  customerUpdateSchema
} from '@stationery/shared';
import { ApiError, createNotFoundError } from '../errors.js';
import { customerLedgerView, customers, db } from '../db/client.js';
import { asyncHandler } from '../utils/async-handler.js';
import { toIsoDateTime } from '../utils/datetime.js';

const router = Router();

const toSearchTerm = (value: string) => `%${value}%`;

router.get(
  '/',
  asyncHandler((req, res) => {
    const query = customerListQuerySchema.parse(req.query);
    const term = query.query ? toSearchTerm(query.query) : undefined;

    const whereClause = term
      ? or(
          like(customers.name, term),
          like(customers.email, term),
          like(customers.phone, term)
        )
      : undefined;

    const orderColumn = query.sort === 'name' ? customers.name : customers.createdAt;

    let selection = db.select().from(customers);
    if (whereClause) {
      selection = selection.where(whereClause);
    }

    selection =
      query.direction === 'asc'
        ? selection.orderBy(orderColumn)
        : selection.orderBy(desc(orderColumn));

    const rows = selection.limit(query.limit).offset(query.offset).all();

    let countQuery = db.select({ count: sql<number>`count(*)` }).from(customers);
    if (whereClause) {
      countQuery = countQuery.where(whereClause);
    }

    const total = countQuery.get()?.count ?? rows.length;

    const payload = customerListResponseSchema.parse({
      data: rows.map(row => ({
        ...row,
        createdAt: toIsoDateTime(row.createdAt)
      })),
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset
      }
    });

    res.json(payload);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = customerCreateSchema.parse(req.body);

    const inserted = db
      .insert(customers)
      .values(body)
      .returning({ id: customers.id })
      .get();

    if (!inserted?.id) {
      throw new ApiError(500, 'insert_failed', 'Failed to create customer');
    }

    const created = await db.query.customers.findFirst({
      where: eq(customers.id, inserted.id)
    });

    if (!created) {
      throw new ApiError(500, 'fetch_failed', 'Failed to load created customer');
    }

    const payload = customerSchema.parse({
      ...created,
      createdAt: toIsoDateTime(created.createdAt)
    });

    res.status(201).json(payload);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const parsedId = customerSchema.shape.id.parse(id);

    const row = await db.query.customers.findFirst({
      where: eq(customers.id, parsedId)
    });

    if (!row) {
      throw createNotFoundError(`Customer ${parsedId} not found`);
    }

    const payload = customerSchema.parse({
      ...row,
      createdAt: toIsoDateTime(row.createdAt)
    });

    res.json(payload);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const parsedId = customerSchema.shape.id.parse(id);
    const body = customerUpdateSchema.parse(req.body);

    const updated = db
      .update(customers)
      .set(body)
      .where(eq(customers.id, parsedId))
      .returning()
      .get();

    if (!updated) {
      throw createNotFoundError(`Customer ${parsedId} not found`);
    }

    const fresh = await db.query.customers.findFirst({
      where: eq(customers.id, parsedId)
    });

    if (!fresh) {
      throw createNotFoundError(`Customer ${parsedId} not found`);
    }

    const payload = customerSchema.parse({
      ...fresh,
      createdAt: toIsoDateTime(fresh.createdAt)
    });

    res.json(payload);
  })
);

router.delete(
  '/:id',
  asyncHandler((req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const parsedId = customerSchema.shape.id.parse(id);

    const result = db.delete(customers).where(eq(customers.id, parsedId)).run();

    if (result.changes === 0) {
      throw createNotFoundError(`Customer ${parsedId} not found`);
    }

    res.status(204).send();
  })
);

router.get(
  '/:id/ledger',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const parsedId = customerSchema.shape.id.parse(id);

    const row = db
      .select()
      .from(customerLedgerView)
      .where(eq(customerLedgerView.customerId, parsedId))
      .get();

    if (!row) {
      throw createNotFoundError(`Ledger for customer ${parsedId} not found`);
    }

    const payload = customerLedgerSchema.parse(row);
    res.json(payload);
  })
);

export { router as customersRouter };
