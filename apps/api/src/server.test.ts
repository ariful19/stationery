import { readFileSync } from 'node:fs';
import { describe, beforeAll, beforeEach, expect, it } from 'vitest';
import request from 'supertest';
import {
  exampleCustomerCreate,
  exampleInvoiceCreate,
  exampleInvoicePdfRequest,
  examplePaymentCreate,
  exampleProductCreate
} from '@stationery/shared';

let app: import('express').Express;
let sqlite: import('better-sqlite3');
let dbModule: Awaited<ReturnType<typeof importDbModule>>;

async function importDbModule() {
  process.env.DATABASE_URL = ':memory:';
  return import('./db/client.js');
}

beforeAll(async () => {
  dbModule = await importDbModule();
  const migrationPath = new URL('../drizzle/0000_slippery_onslaught.sql', import.meta.url);
  const migrationSql = readFileSync(migrationPath, 'utf8');
  dbModule.sqlite.exec(migrationSql);
  const { createServer } = await import('./server.js');
  app = createServer();
  sqlite = dbModule.sqlite;
});

beforeEach(() => {
  sqlite.exec(
    [
      'DELETE FROM invoice_items;',
      'DELETE FROM payments;',
      'DELETE FROM invoices;',
      'DELETE FROM products;',
      'DELETE FROM customers;'
    ].join('\n')
  );
});

describe('API server', () => {
  it('responds to /api/v1/health', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.checks[0].status).toBe('pass');
  });

  it('creates and retrieves customers using documented payloads', async () => {
    const createResponse = await request(app).post('/api/v1/customers').send(exampleCustomerCreate);
    expect(createResponse.status).toBe(201);
    const customerId = createResponse.body.id;

    const getResponse = await request(app).get(`/api/v1/customers/${customerId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.name).toBe(exampleCustomerCreate.name);

    const listResponse = await request(app).get('/api/v1/customers');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
  });

  it('handles invoices, payments, and reports end-to-end', async () => {
    const customer = dbModule.db
      .insert(dbModule.customers)
      .values(exampleCustomerCreate)
      .returning()
      .get();

    const product = dbModule.db
      .insert(dbModule.products)
      .values(exampleProductCreate)
      .returning()
      .get();

    const invoicePayload = {
      ...exampleInvoiceCreate,
      customerId: customer.id,
      items: [
        {
          productId: product.id,
          quantity: 2,
          unitPriceCents: product.unitPriceCents,
          description: product.description
        }
      ]
    };

    const invoiceResponse = await request(app).post('/api/v1/invoices').send(invoicePayload);
    expect(invoiceResponse.status).toBe(201);
    const invoiceId = invoiceResponse.body.id;
    expect(invoiceResponse.body.items).toHaveLength(1);

    const paymentPayload = {
      ...examplePaymentCreate,
      customerId: customer.id,
      invoiceId,
      amountCents: invoiceResponse.body.grandTotalCents / 2
    };

    const paymentResponse = await request(app).post('/api/v1/payments').send(paymentPayload);
    expect(paymentResponse.status).toBe(201);

    const listInvoices = await request(app).get('/api/v1/invoices');
    expect(listInvoices.status).toBe(200);
    expect(listInvoices.body.data[0].id).toBe(invoiceId);

    const duesReport = await request(app).get('/api/v1/reports/dues');
    expect(duesReport.status).toBe(200);
    expect(duesReport.body.summary.totalBalanceCents).toBe(
      invoiceResponse.body.grandTotalCents - paymentPayload.amountCents
    );
    expect(duesReport.body.summary.totalInvoicedCents).toBe(invoiceResponse.body.grandTotalCents);

    const salesReport = await request(app).get('/api/v1/reports/sales').query({ groupBy: 'month' });
    expect(salesReport.status).toBe(200);
    expect(salesReport.body.rows.length).toBeGreaterThan(0);
    expect(salesReport.body.summary.totalInvoicesCount).toBeGreaterThan(0);

    const paymentsLedger = await request(app).get('/api/v1/reports/payments');
    expect(paymentsLedger.status).toBe(200);
    expect(paymentsLedger.body.entries.length).toBe(1);
    expect(paymentsLedger.body.summary.totalPaidCents).toBe(paymentPayload.amountCents);

    expect(paymentsLedger.body.summary.totalPaidCents).toBe(
      duesReport.body.summary.totalInvoicedCents - duesReport.body.summary.totalBalanceCents
    );

    const salesCsv = await request(app).get('/api/v1/reports/sales.csv');
    expect(salesCsv.status).toBe(200);
    expect(salesCsv.headers['content-type']).toContain('text/csv');
    expect(salesCsv.text).toContain('Period');

    const duesPdf = await request(app)
      .get('/api/v1/reports/dues.pdf')
      .buffer()
      .parse((res, callback) => {
        const chunks: Uint8Array[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(duesPdf.status).toBe(200);
    expect(duesPdf.headers['content-type']).toBe('application/pdf');
    expect(duesPdf.body.length).toBeGreaterThan(0);

    const pdfResponse = await request(app)
      .post(`/api/v1/invoices/${invoiceId}/pdf`)
      .send(exampleInvoicePdfRequest)
      .buffer()
      .parse((res, callback) => {
        const chunks: Uint8Array[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers['content-type']).toBe('application/pdf');
    expect(pdfResponse.headers['content-disposition']).toContain('attachment');
    expect(pdfResponse.body.length).toBeGreaterThan(0);

    const docsResponse = await request(app).get('/docs/openapi.json');
    expect(docsResponse.status).toBe(200);
    expect(docsResponse.body.paths['/api/v1/invoices']).toBeDefined();
    expect(docsResponse.body.paths['/api/v1/invoices/{id}/pdf']).toBeDefined();
  });
});
