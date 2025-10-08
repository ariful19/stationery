import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  customerLedgerSchema,
  customerListResponseSchema,
  customerSchema,
  duesReportSchema,
  exampleCustomerCreate,
  exampleInvoiceCreate,
  exampleInvoicePdfRequest,
  examplePaymentCreate,
  exampleProductCreate,
  invoiceListResponseSchema,
  invoiceSchema,
  invoicePdfRequestSchema,
  paymentListResponseSchema,
  paymentSchema,
  paymentsLedgerSchema,
  productSchema,
  salesReportSchema
} from '@stationery/shared';
import { createOpenApiDocument } from './docs/openapi.js';
import { createTestDatabase, resetTestDatabase } from './test-utils/create-test-db.js';

const testDb = createTestDatabase();

vi.mock('./db/client.js', () => testDb);

const { createServer } = await import('./server.js');

describe('API server contract', () => {
  const app = createServer();

  beforeAll(() => {
    process.env.TZ = 'UTC';
  });

  beforeEach(() => {
    resetTestDatabase(testDb.sqlite);
  });

  afterAll(() => {
    testDb.sqlite.close();
  });

  it('serves an OpenAPI document that matches the generator output', async () => {
    const response = await request(app).get('/docs/openapi.json');
    expect(response.status).toBe(200);
    const fromServer = response.body;
    const generated = createOpenApiDocument();
    expect(fromServer).toEqual(generated);
  });

  it('validates customer, product, invoice and payment lifecycles against schemas', async () => {
    const healthResponse = await request(app).get('/api/v1/health');
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.status).toBe('ok');

    const createdCustomer = await request(app)
      .post('/api/v1/customers')
      .send(exampleCustomerCreate);
    expect(createdCustomer.status).toBe(201);
    const customer = customerSchema.parse(createdCustomer.body);

    const fetchedCustomer = await request(app).get(`/api/v1/customers/${customer.id}`);
    expect(fetchedCustomer.status).toBe(200);
    expect(customerSchema.parse(fetchedCustomer.body)).toMatchObject({ id: customer.id });

    const listCustomers = await request(app).get('/api/v1/customers');
    expect(listCustomers.status).toBe(200);
    const customersList = customerListResponseSchema.parse(listCustomers.body);
    expect(customersList.data).toHaveLength(1);

    const createdProduct = await request(app).post('/api/v1/products').send(exampleProductCreate);
    expect(createdProduct.status).toBe(201);
    const product = productSchema.parse(createdProduct.body);

    const invoicePayload = {
      ...exampleInvoiceCreate,
      customerId: customer.id,
      items: [
        {
          productId: product.id,
          quantity: 2,
          unitPriceCents: product.unitPriceCents,
          description: product.description ?? undefined
        }
      ]
    };

    const createdInvoice = await request(app).post('/api/v1/invoices').send(invoicePayload);
    expect(createdInvoice.status).toBe(201);
    const invoice = invoiceSchema.parse(createdInvoice.body);
    expect(invoice.items[0]?.productId).toBe(product.id);

    const invoiceList = await request(app).get('/api/v1/invoices');
    expect(invoiceList.status).toBe(200);
    const invoices = invoiceListResponseSchema.parse(invoiceList.body);
    expect(invoices.data[0]?.id).toBe(invoice.id);

    const paymentPayload = {
      ...examplePaymentCreate,
      customerId: customer.id,
      invoiceId: invoice.id,
      amountCents: Math.trunc(invoice.grandTotalCents / 2)
    };

    const createdPayment = await request(app).post('/api/v1/payments').send(paymentPayload);
    expect(createdPayment.status).toBe(201);
    const payment = paymentSchema.parse(createdPayment.body);
    expect(payment.amountCents).toBe(paymentPayload.amountCents);

    const paymentList = await request(app).get('/api/v1/payments');
    expect(paymentList.status).toBe(200);
    const payments = paymentListResponseSchema.parse(paymentList.body);
    expect(payments.data[0]?.id).toBe(payment.id);

    const customerLedger = await request(app).get(`/api/v1/customers/${customer.id}/ledger`);
    expect(customerLedger.status).toBe(200);
    expect(customerLedgerSchema.parse(customerLedger.body).customerId).toBe(customer.id);

    const duesReport = await request(app).get('/api/v1/reports/dues');
    expect(duesReport.status).toBe(200);
    const dues = duesReportSchema.parse(duesReport.body);
    const duesEntry = dues.customers.find(entry => entry.customerId === customer.id);
    expect(duesEntry?.balanceCents).toBe(invoice.grandTotalCents - paymentPayload.amountCents);

    const salesReport = await request(app)
      .get('/api/v1/reports/sales')
      .query({ groupBy: 'month', from: '2023-01-01', to: '2025-12-31' });
    expect(salesReport.status).toBe(200);
    const sales = salesReportSchema.parse(salesReport.body);
    expect(sales.summary.totalInvoicesCount).toBeGreaterThan(0);

    const paymentsLedger = await request(app).get('/api/v1/reports/payments');
    expect(paymentsLedger.status).toBe(200);
    const ledger = paymentsLedgerSchema.parse(paymentsLedger.body);
    expect(ledger.entries[0]?.invoiceId).toBe(invoice.id);

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

    const pdfResponse = await request(app)
      .post(`/api/v1/invoices/${invoice.id}/pdf`)
      .send(invoicePdfRequestSchema.parse(exampleInvoicePdfRequest))
      .buffer()
      .parse((res, callback) => {
        const chunks: Uint8Array[] = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers['content-type']).toBe('application/pdf');
    expect(pdfResponse.headers['content-disposition']).toContain('attachment');
  });
});
