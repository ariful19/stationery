import { faker } from '@faker-js/faker';
import {
  buildInvoiceNumber,
  type InvoiceNumberConfig,
  resolveInvoiceSeriesKey,
} from '@stationery/shared';
import { sql } from 'drizzle-orm';

import { customers, db, invoiceItems, invoices, payments, products, sqlite } from './client.js';

const toCents = (value: number) => Math.round(value * 100);
const parseCount = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parsePadding = (value: string | undefined) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const config = {
  reset: process.env.SEED_RESET === 'true',
  customerCount: parseCount(process.env.SEED_CUSTOMERS, 20),
  productCount: parseCount(process.env.SEED_PRODUCTS, 15),
  invoiceCount: parseCount(process.env.SEED_INVOICES, 35),
  invoiceNumbers: {
    prefix: process.env.INVOICE_PREFIX ?? 'INV',
    sequencePadding: parsePadding(process.env.INVOICE_SEQUENCE_PADDING),
  } satisfies InvoiceNumberConfig,
};

const sequenceCache = new Map<string, number>();
const log = (message: string) => console.log(`[seed:faker] ${message}`);

const fakerSeed = process.env.SEED_FAKER_SEED;
if (fakerSeed) {
  const parsed = Number.parseInt(fakerSeed, 10);
  if (Number.isFinite(parsed)) {
    faker.seed(parsed);
    log(`Using deterministic faker seed ${parsed}`);
  }
}

try {
  if (config.reset) {
    log('Clearing existing tables');
    sqlite.exec(`
      DELETE FROM invoice_items;
      DELETE FROM payments;
      DELETE FROM invoices;
      DELETE FROM products;
      DELETE FROM customers;
    `);
  }

  const hasCustomersTable = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'")
    .get();

  if (!hasCustomersTable) {
    throw new Error('Database schema is missing. Run "pnpm db:push" first.');
  }

  const customerRows = Array.from({ length: config.customerCount }, () => ({
    name: faker.company.name(),
    phone: faker.phone.number(),
    email: faker.internet.email().toLowerCase(),
    address: faker.location.streetAddress({ useFullAddress: true }),
  }));

  const productRows = Array.from({ length: config.productCount }, () => ({
    sku: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    unitPriceCents: Math.max(
      150,
      toCents(faker.number.float({ min: 3, max: 120, fractionDigits: 2 })),
    ),
    stockQty: faker.number.int({ min: 10, max: 250 }),
  }));

  const insertedCustomers = db
    .insert(customers)
    .values(customerRows)
    .returning({ id: customers.id, name: customers.name })
    .all();

  const insertedProducts = db
    .insert(products)
    .values(productRows)
    .returning({
      id: products.id,
      name: products.name,
      description: products.description,
      unitPriceCents: products.unitPriceCents,
    })
    .all();

  log(`Inserted ${insertedCustomers.length} customers and ${insertedProducts.length} products`);

  const ensureSequence = (issueDate: Date) => {
    const seriesKey = resolveInvoiceSeriesKey(issueDate, config.invoiceNumbers);
    if (!sequenceCache.has(seriesKey)) {
      const countResult = db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(sql`invoice_no LIKE ${seriesKey} || '-%'`)
        .get();
      sequenceCache.set(seriesKey, countResult?.count ?? 0);
    }
    const nextSequence = (sequenceCache.get(seriesKey) ?? 0) + 1;
    sequenceCache.set(seriesKey, nextSequence);
    return { seriesKey, nextSequence };
  };

  const statusPool: Array<(typeof invoices.$inferInsert)['status']> = [
    'draft',
    'issued',
    'partial',
    'paid',
  ];

  const invoiceNotes = () =>
    faker.helpers.maybe(() => faker.lorem.sentence({ min: 8, max: 15 }), {
      probability: 0.35,
    });

  for (let index = 0; index < config.invoiceCount; index += 1) {
    const customer = faker.helpers.arrayElement(insertedCustomers);
    const chosenProducts = faker.helpers
      .shuffle(insertedProducts)
      .slice(0, faker.number.int({ min: 1, max: Math.min(4, insertedProducts.length) }));

    if (!customer || chosenProducts.length === 0) {
      continue;
    }

    const issueDate = faker.date.recent({ days: 180 });
    const { nextSequence } = ensureSequence(issueDate);
    const invoiceNo = buildInvoiceNumber(nextSequence, issueDate, config.invoiceNumbers);
    const status = faker.helpers.arrayElement(statusPool);

    let subTotalCents = 0;
    const itemRows = chosenProducts.map((product) => {
      const quantity = faker.number.int({ min: 1, max: 6 });
      const lineTotalCents = quantity * product.unitPriceCents;
      subTotalCents += lineTotalCents;
      return {
        productId: product.id,
        description: faker.helpers.maybe(
          () => product.description ?? faker.commerce.productDescription(),
          {
            probability: 0.5,
          },
        ),
        quantity,
        unitPriceCents: product.unitPriceCents,
        lineTotalCents,
      };
    });

    const discountCents =
      faker.helpers.maybe(
        () => Math.round(subTotalCents * faker.number.float({ min: 0.05, max: 0.15 })),
        { probability: 0.25 },
      ) ?? 0;
    const taxableBase = Math.max(0, subTotalCents - discountCents);
    const taxCents =
      faker.helpers.maybe(
        () => Math.round(taxableBase * faker.number.float({ min: 0.05, max: 0.2 })),
        { probability: 0.6 },
      ) ?? 0;
    const grandTotalCents = taxableBase + taxCents;

    const invoiceId = db.transaction((tx) => {
      const inserted = tx
        .insert(invoices)
        .values({
          invoiceNo,
          customerId: customer.id,
          issueDate: issueDate.toISOString(),
          subTotalCents,
          discountCents,
          taxCents,
          grandTotalCents,
          status,
          notes: invoiceNotes() ?? null,
        })
        .returning({ id: invoices.id })
        .get();

      if (!inserted) {
        throw new Error('Failed to insert invoice');
      }

      tx.insert(invoiceItems)
        .values(
          itemRows.map((item) => ({
            ...item,
            invoiceId: inserted.id,
          })),
        )
        .run();

      let paidCents = 0;
      if (status === 'paid') {
        paidCents = grandTotalCents;
      } else if (status === 'partial') {
        paidCents = Math.round(grandTotalCents * faker.number.float({ min: 0.25, max: 0.75 }));
      }

      if (paidCents > 0) {
        tx.insert(payments)
          .values({
            customerId: customer.id,
            invoiceId: inserted.id,
            amountCents: paidCents,
            method: faker.helpers.arrayElement(['card', 'cash', 'bank_transfer']),
            paidAt: faker.date.between({ from: issueDate, to: new Date() }).toISOString(),
            note: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.25 }) ?? null,
          })
          .run();
      }

      return inserted.id;
    });

    log(`Generated invoice ${invoiceNo} (ID: ${invoiceId}) for ${customer.name}`);
  }

  log('Faker seeding complete');
} catch (error) {
  log(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  sqlite.close();
}
