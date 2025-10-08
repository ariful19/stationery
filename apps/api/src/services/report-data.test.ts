import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, resetTestDatabase } from '../test-utils/create-test-db.js';

const testDb = createTestDatabase();

vi.mock('../db/client.js', () => testDb);

const { getDuesReport, getPaymentsLedger, getSalesReport } = await import('./report-data.js');

interface SeedData {
  customerA: number;
  customerB: number;
  invoiceA: { id: number; grandTotalCents: number };
  invoiceB: { id: number; grandTotalCents: number };
}

function seedLedger(): SeedData {
  const customerA = testDb.db
    .insert(testDb.customers)
    .values({ name: 'Alpha Industries', email: 'alpha@example.test' })
    .returning({ id: testDb.customers.id })
    .get().id;

  const customerB = testDb.db
    .insert(testDb.customers)
    .values({ name: 'Beta Studios', email: 'beta@example.test' })
    .returning({ id: testDb.customers.id })
    .get().id;

  const product = testDb.db
    .insert(testDb.products)
    .values({
      sku: 'TEST-SKU-001',
      name: 'Notebook',
      description: 'Plain notebook',
      unitPriceCents: 2500,
      stockQty: 10
    })
    .returning({ id: testDb.products.id, price: testDb.products.unitPriceCents })
    .get();

  const invoiceA = testDb.db
    .insert(testDb.invoices)
    .values({
      invoiceNo: 'INV-LEDGER-A',
      customerId: customerA,
      issueDate: '2024-03-15T00:00:00.000Z',
      subTotalCents: 5000,
      discountCents: 0,
      taxCents: 250,
      grandTotalCents: 5250,
      status: 'issued'
    })
    .returning({ id: testDb.invoices.id, grandTotalCents: testDb.invoices.grandTotalCents })
    .get();

  testDb.db
    .insert(testDb.invoiceItems)
    .values({
      invoiceId: invoiceA.id,
      productId: product.id,
      quantity: 2,
      unitPriceCents: product.price,
      lineTotalCents: 5000,
      description: 'Notebooks'
    })
    .run();

  const invoiceB = testDb.db
    .insert(testDb.invoices)
    .values({
      invoiceNo: 'INV-LEDGER-B',
      customerId: customerA,
      issueDate: '2024-04-10T00:00:00.000Z',
      subTotalCents: 10000,
      discountCents: 0,
      taxCents: 0,
      grandTotalCents: 10000,
      status: 'partial'
    })
    .returning({ id: testDb.invoices.id, grandTotalCents: testDb.invoices.grandTotalCents })
    .get();

  testDb.db
    .insert(testDb.invoiceItems)
    .values({
      invoiceId: invoiceB.id,
      productId: product.id,
      quantity: 4,
      unitPriceCents: product.price,
      lineTotalCents: 10000,
      description: 'Bulk notebooks'
    })
    .run();

  const invoiceC = testDb.db
    .insert(testDb.invoices)
    .values({
      invoiceNo: 'INV-LEDGER-C',
      customerId: customerB,
      issueDate: '2024-05-05T00:00:00.000Z',
      subTotalCents: 7500,
      discountCents: 500,
      taxCents: 0,
      grandTotalCents: 7000,
      status: 'paid'
    })
    .returning({ id: testDb.invoices.id, grandTotalCents: testDb.invoices.grandTotalCents })
    .get();

  testDb.db
    .insert(testDb.invoiceItems)
    .values({
      invoiceId: invoiceC.id,
      productId: product.id,
      quantity: 3,
      unitPriceCents: product.price,
      lineTotalCents: 7500,
      description: 'Beta order'
    })
    .run();

  testDb.db
    .insert(testDb.payments)
    .values({
      customerId: customerA,
      invoiceId: invoiceA.id,
      amountCents: 2000,
      method: 'card',
      paidAt: '2024-03-20T10:00:00.000Z',
      note: 'Partial payment A'
    })
    .run();

  testDb.db
    .insert(testDb.payments)
    .values({
      customerId: customerA,
      invoiceId: invoiceB.id,
      amountCents: 4000,
      method: 'other',
      paidAt: '2024-04-15T08:00:00.000Z',
      note: 'Partial payment B'
    })
    .run();

  testDb.db
    .insert(testDb.payments)
    .values({
      customerId: customerB,
      invoiceId: invoiceC.id,
      amountCents: invoiceC.grandTotalCents,
      method: 'cash',
      paidAt: '2024-05-06T09:30:00.000Z',
      note: 'Paid in full'
    })
    .run();

  return {
    customerA,
    customerB,
    invoiceA: { id: invoiceA.id, grandTotalCents: invoiceA.grandTotalCents },
    invoiceB: { id: invoiceB.id, grandTotalCents: invoiceB.grandTotalCents }
  };
}

describe('report-data services', () => {
  beforeEach(() => {
    resetTestDatabase(testDb.sqlite);
  });

  afterAll(() => {
    testDb.sqlite.close();
  });

  it('builds dues report summaries with optional filters', () => {
    const seeded = seedLedger();

  const all = getDuesReport();
  expect(all.summary.customersCount).toBeGreaterThan(0);
  const alpha = all.customers.find(row => row.customerId === seeded.customerA);
  expect(alpha?.balanceCents).toBe(5250 + 10000 - (2000 + 4000));

    const filtered = getDuesReport({
      customerId: seeded.customerA,
      minBalanceCents: 1000,
      search: 'alpha'
    });
    expect(filtered.customers).toHaveLength(1);
    expect(filtered.customers[0]?.customerId).toBe(seeded.customerA);
  });

  it('groups sales by month and respects issued status filter', () => {
    seedLedger();
    const report = getSalesReport({ groupBy: 'month', from: '2024-03-01', to: '2024-05-31' });
    expect(report.rows.length).toBeGreaterThan(0);
    const months = report.rows.map(row => row.period);
    expect(months).toContain('2024-03');
    expect(months).toContain('2024-04');
    expect(report.summary.totalInvoicesCount).toBeGreaterThan(0);
  });

  it('retrieves payments ledger entries with ordering and filters', () => {
    const seeded = seedLedger();

  const descLedger = getPaymentsLedger({ customerId: seeded.customerA });
  expect(descLedger.entries[0]?.invoiceId).toBeDefined();
  expect(descLedger.summary.totalPaidCents).toBe(2000 + 4000);
    const ascLedger = getPaymentsLedger({
      customerId: seeded.customerA,
      invoiceId: seeded.invoiceB.id,
      from: '2024-04-01',
      to: '2024-04-30',
      direction: 'asc'
    });
    expect(ascLedger.entries).toHaveLength(1);
    expect(ascLedger.entries[0]?.invoiceId).toBe(seeded.invoiceB.id);
  });
});
