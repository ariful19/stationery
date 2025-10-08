import { Router } from 'express';
import type { SQL } from 'drizzle-orm';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  buildInvoiceNumber,
  calculateInvoiceTotals,
  invoiceCreateSchema,
  invoiceListQuerySchema,
  invoiceListResponseSchema,
  invoiceSchema,
  invoiceStatusSchema,
  invoicePdfRequestSchema,
  resolveInvoiceSeriesKey,
  type InvoiceNumberConfig,
  type RoundingMode
} from '@stationery/shared';
import { ApiError, createNotFoundError } from '../errors.js';
import {
  customers,
  db,
  invoiceItems,
  invoices,
  payments,
  products
} from '../db/client.js';
import { asyncHandler } from '../utils/async-handler.js';
import { toIsoDateTime } from '../utils/datetime.js';
import { getInvoicePdfRenderer } from '../services/invoice-pdf.js';
import { maybePreviewPdf, sendPdfBuffer } from '../utils/pdf.js';
import type {
  InferSelectModel
} from 'drizzle-orm';

const router = Router();

const normalizeIso = (value: string | null | undefined) => toIsoDateTime(value);

const roundingModes: RoundingMode[] = [
  'HALF_UP',
  'HALF_DOWN',
  'HALF_EVEN',
  'CEIL',
  'FLOOR',
  'TRUNCATE'
];

const envRoundingMode = process.env.BILLING_ROUNDING_MODE as RoundingMode | undefined;
const roundingMode = envRoundingMode && roundingModes.includes(envRoundingMode)
  ? envRoundingMode
  : 'HALF_EVEN';

const invoiceRoundingConfig = { decimals: 0, mode: roundingMode } as const;

const parsedSequencePadding = Number.parseInt(process.env.INVOICE_SEQUENCE_PADDING ?? '', 10);

const invoiceNumberConfig: InvoiceNumberConfig = {
  prefix: process.env.INVOICE_PREFIX ?? 'INV',
  sequencePadding: Number.isFinite(parsedSequencePadding) ? parsedSequencePadding : undefined
};

type InvoiceRow = InferSelectModel<typeof invoices> & {
  customer?: InferSelectModel<typeof customers> | null;
  items: InferSelectModel<typeof invoiceItems>[];
  payments: InferSelectModel<typeof payments>[];
};

const normalizeInvoice = (invoice: InvoiceRow) =>
  invoiceSchema.parse({
    ...invoice,
    issueDate: normalizeIso(invoice.issueDate),
    notes: invoice.notes ?? null,
    customer: invoice.customer
      ? {
          ...invoice.customer,
          createdAt: normalizeIso(invoice.customer.createdAt)
        }
      : undefined,
    items: (invoice.items ?? []).map(item => ({
      ...item,
      description: item.description ?? null
    })),
    payments: (invoice.payments ?? []).map(payment => ({
      ...payment,
      note: payment.note ?? undefined,
      paidAt: normalizeIso(payment.paidAt)
    }))
  });

const fetchInvoiceById = (id: number) =>
  db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: {
      customer: true,
      items: true,
      payments: true
    }
  });

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = invoiceCreateSchema.parse(req.body);

    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, payload.customerId)
    });

    if (!customer) {
      throw new ApiError(400, 'invalid_customer', 'Customer does not exist');
    }

    const productIds = Array.from(new Set(payload.items.map(item => item.productId)));
    const dbProducts = productIds.length
      ? db.select().from(products).where(inArray(products.id, productIds)).all()
      : [];

    if (dbProducts.length !== productIds.length) {
      throw new ApiError(400, 'invalid_product', 'One or more products do not exist');
    }

    const totals = calculateInvoiceTotals(
      {
        items: payload.items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents
        })),
        discountCents: payload.discountCents,
        taxCents: payload.taxCents
      },
      invoiceRoundingConfig
    );

    const issueDateIso = payload.issueDate ?? new Date().toISOString();
    const issueDate = new Date(issueDateIso);

    if (Number.isNaN(issueDate.getTime())) {
      throw new ApiError(400, 'invalid_issue_date', 'Issue date is invalid');
    }

    const invoiceNo =
      payload.invoiceNo ??
      (() => {
        const seriesKey = resolveInvoiceSeriesKey(issueDate, invoiceNumberConfig);
        const likePattern = `${seriesKey}-%`;
        const countResult = db
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .where(sql`invoice_no LIKE ${likePattern}`)
          .get();
        const nextSequence = (countResult?.count ?? 0) + 1;
        return buildInvoiceNumber(nextSequence, issueDate, invoiceNumberConfig);
      })();

    const insertedId = db.transaction(tx => {
      const insertedInvoice = tx
        .insert(invoices)
        .values({
          invoiceNo,
          customerId: payload.customerId,
          issueDate: issueDateIso,
          subTotalCents: totals.subTotalCents,
          discountCents: totals.discountCents,
          taxCents: totals.taxCents,
          grandTotalCents: totals.grandTotalCents,
          status: payload.status ?? invoiceStatusSchema.enum.draft,
          notes: payload.notes ?? null
        })
        .returning({ id: invoices.id })
        .get();

      if (!insertedInvoice) {
        throw new ApiError(500, 'insert_failed', 'Failed to create invoice');
      }

      tx.insert(invoiceItems)
        .values(
          totals.items.map(item => ({
            invoiceId: insertedInvoice.id,
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: item.lineTotalCents
          }))
        )
        .run();

      return insertedInvoice.id;
    });

    const record = await fetchInvoiceById(insertedId);

    if (!record) {
      throw new ApiError(500, 'fetch_failed', 'Created invoice could not be retrieved');
    }

    const payloadResponse = normalizeInvoice(record as InvoiceRow);

    res.status(201).json(payloadResponse);
  })
);

router.post(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isFinite(id)) {
      throw new ApiError(400, 'invalid_invoice_id', 'Invoice id must be a number');
    }

    const invoiceRecord = await fetchInvoiceById(id);

    if (!invoiceRecord) {
      throw createNotFoundError(`Invoice ${id} not found`);
    }

    const renderOptions = invoicePdfRequestSchema.parse(req.body ?? {});
    const normalizedInvoice = normalizeInvoice(invoiceRecord as InvoiceRow);

    const renderer = getInvoicePdfRenderer();
    const pdfBuffer = await renderer.render(normalizedInvoice, {
      variant: renderOptions.variant,
      locale: renderOptions.locale,
      currency: renderOptions.currency,
      timezone: renderOptions.timezone,
      direction: renderOptions.direction,
      brand: renderOptions.brand
    });

    const previewPath = await maybePreviewPdf(pdfBuffer, normalizedInvoice.invoiceNo);
    if (previewPath) {
      res.setHeader('X-PDF-Preview-Path', previewPath);
    }

    const safeNumber = normalizedInvoice.invoiceNo.replace(/[^\w-]+/g, '_');
    const filename = `${safeNumber || `INV-${normalizedInvoice.id}`}.pdf`;
    res.status(200);
    sendPdfBuffer(res, pdfBuffer, { filename });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const parsedId = invoiceSchema.shape.id.parse(id);

    const record = await fetchInvoiceById(parsedId);

    if (!record) {
      throw createNotFoundError(`Invoice ${parsedId} not found`);
    }

    const payloadResponse = normalizeInvoice(record as InvoiceRow);
    res.json(payloadResponse);
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = invoiceListQuerySchema.parse(req.query);
    const statuses = query.status
      ? Array.isArray(query.status)
        ? query.status
        : [query.status]
      : undefined;

    const filters: SQL[] = [];

    if (statuses?.length) {
      filters.push(inArray(invoices.status, statuses));
    }

    if (query.customerId) {
      filters.push(eq(invoices.customerId, query.customerId));
    }

    if (query.from) {
      filters.push(sql`datetime(${invoices.issueDate}) >= datetime(${query.from} || ' 00:00:00')`);
    }

    if (query.to) {
      filters.push(sql`datetime(${invoices.issueDate}) <= datetime(${query.to} || ' 23:59:59')`);
    }

    if (query.query) {
      const term = `%${query.query}%`;
      filters.push(sql`${invoices.invoiceNo} LIKE ${term}`);
    }

    const whereClause: SQL | undefined =
      filters.length === 0
        ? undefined
        : filters.length === 1
          ? (filters[0] as SQL)
          : and(...(filters as [SQL, SQL, ...SQL[]]));

    const rows = await db.query.invoices.findMany({
      where: whereClause,
      with: {
        customer: true,
        items: true,
        payments: true
      },
      limit: query.limit,
      offset: query.offset,
      orderBy: fields => [
        query.direction === 'asc'
          ? fields[query.sort === 'invoiceNo' ? 'invoiceNo' : 'issueDate']
          : desc(fields[query.sort === 'invoiceNo' ? 'invoiceNo' : 'issueDate'])
      ]
    });

    const baseCountQuery = db.select({ count: sql<number>`count(*)` }).from(invoices);
    const filteredCountQuery = whereClause
      ? baseCountQuery.where(whereClause)
      : baseCountQuery;

    const total = filteredCountQuery.get()?.count ?? rows.length;

    const payload = invoiceListResponseSchema.parse({
      data: rows.map(record => normalizeInvoice(record as InvoiceRow)),
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset
      }
    });

    res.json(payload);
  })
);

export { router as invoicesRouter };
