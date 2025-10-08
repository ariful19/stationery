import {
  productCreateSchema,
  productListQuerySchema,
  productListResponseSchema,
  productSchema,
  productUpdateSchema,
} from '@stationery/shared';
import { desc, eq, like, or, sql } from 'drizzle-orm';
import { Router } from 'express';

import { db, products } from '../db/client.js';
import { ApiError, createNotFoundError } from '../errors.js';
import { asyncHandler } from '../utils/async-handler.js';
import { toIsoDateTime } from '../utils/datetime.js';

const router = Router();

const toSearchTerm = (value: string) => `%${value}%`;

router.get(
  '/',
  asyncHandler((req, res) => {
    const query = productListQuerySchema.parse(req.query);
    const term = query.query ? toSearchTerm(query.query) : undefined;

    const whereClause = term
      ? or(like(products.name, term), like(products.sku, term), like(products.description, term))
      : undefined;

    const orderColumn =
      query.sort === 'name'
        ? products.name
        : query.sort === 'sku'
          ? products.sku
          : products.createdAt;

    const baseSelection = db.select().from(products);
    const filteredSelection = whereClause ? baseSelection.where(whereClause) : baseSelection;

    const orderedSelection =
      query.direction === 'asc'
        ? filteredSelection.orderBy(orderColumn)
        : filteredSelection.orderBy(desc(orderColumn));

    const rows = orderedSelection.limit(query.limit).offset(query.offset).all();

    const baseCountQuery = db.select({ count: sql<number>`count(*)` }).from(products);
    const filteredCountQuery = whereClause ? baseCountQuery.where(whereClause) : baseCountQuery;

    const total = filteredCountQuery.get()?.count ?? rows.length;

    const payload = productListResponseSchema.parse({
      data: rows.map((row) => ({
        ...row,
        createdAt: toIsoDateTime(row.createdAt),
      })),
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    });

    res.json(payload);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = productCreateSchema.parse(req.body);

    const inserted = db.insert(products).values(body).returning({ id: products.id }).get();

    if (!inserted?.id) {
      throw new ApiError(500, 'insert_failed', 'Failed to create product');
    }

    const created = await db.query.products.findFirst({
      where: eq(products.id, inserted.id),
    });

    if (!created) {
      throw new ApiError(500, 'fetch_failed', 'Failed to load created product');
    }

    const payload = productSchema.parse({
      ...created,
      createdAt: toIsoDateTime(created.createdAt),
    });

    res.status(201).json(payload);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const parsedId = productSchema.shape.id.parse(id);

    const row = await db.query.products.findFirst({
      where: eq(products.id, parsedId),
    });

    if (!row) {
      throw createNotFoundError(`Product ${parsedId} not found`);
    }

    const payload = productSchema.parse({
      ...row,
      createdAt: toIsoDateTime(row.createdAt),
    });

    res.json(payload);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const parsedId = productSchema.shape.id.parse(id);
    const body = productUpdateSchema.parse(req.body);

    const updated = db
      .update(products)
      .set(body)
      .where(eq(products.id, parsedId))
      .returning()
      .get();

    if (!updated) {
      throw createNotFoundError(`Product ${parsedId} not found`);
    }

    const fresh = await db.query.products.findFirst({
      where: eq(products.id, parsedId),
    });

    if (!fresh) {
      throw createNotFoundError(`Product ${parsedId} not found`);
    }

    const payload = productSchema.parse({
      ...fresh,
      createdAt: toIsoDateTime(fresh.createdAt),
    });

    res.json(payload);
  }),
);

router.delete(
  '/:id',
  asyncHandler((req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const parsedId = productSchema.shape.id.parse(id);

    const result = db.delete(products).where(eq(products.id, parsedId)).run();

    if (result.changes === 0) {
      throw createNotFoundError(`Product ${parsedId} not found`);
    }

    res.status(204).send();
  }),
);

export { router as productsRouter };
