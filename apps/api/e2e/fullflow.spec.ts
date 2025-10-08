import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const baseCustomerPayload = {
  name: 'Playwright Demo Customer',
  emailPrefix: 'playwright-demo',
  emailDomain: 'example.test',
  phone: '+1 555 0199',
  address: '99 Assertion Ave'
} as const;

const baseProductPayload = {
  skuPrefix: 'PLAYWRIGHT-SKU',
  name: 'Playwright Premium Paper',
  description: 'Premium stationery product used in automated scenarios.',
  unitPriceCents: 4200,
  stockQty: 50
} as const;

test('creates an end-to-end billing flow', async ({ request }, testInfo) => {
  const uniqueSuffix = randomUUID().slice(0, 8);

  const customerPayload = {
    name: `${baseCustomerPayload.name} ${uniqueSuffix}`,
    email: `${baseCustomerPayload.emailPrefix}-${uniqueSuffix}@${baseCustomerPayload.emailDomain}`,
    phone: baseCustomerPayload.phone,
    address: baseCustomerPayload.address
  };

  const productPayload = {
    sku: `${baseProductPayload.skuPrefix}-${uniqueSuffix}`,
    name: `${baseProductPayload.name} ${uniqueSuffix}`,
    description: baseProductPayload.description,
    unitPriceCents: baseProductPayload.unitPriceCents,
    stockQty: baseProductPayload.stockQty
  };

  const existingResponse = await request.get(`customers?query=${encodeURIComponent(customerPayload.name)}`);
  if (existingResponse.ok()) {
    const existing = await existingResponse.json();
    if (Array.isArray(existing?.data)) {
      await Promise.all(
        existing.data.map((customer: { id: number }) => request.delete(`customers/${customer.id}`))
      );
    }
  }

  const existingProductResponse = await request.get(`products?query=${encodeURIComponent(productPayload.name)}`);
  if (existingProductResponse.ok()) {
    const existingProducts = await existingProductResponse.json();
    if (Array.isArray(existingProducts?.data)) {
      await Promise.all(
        existingProducts.data.map((product: { id: number }) => request.delete(`products/${product.id}`))
      );
    }
  }

  const customerResponse = await request.post('customers', { data: customerPayload });
  expect(customerResponse.ok()).toBeTruthy();
  const customer = await customerResponse.json();
  expect(customer.name).toBe(customerPayload.name);

  const productResponse = await request.post('products', { data: productPayload });
  expect(productResponse.ok()).toBeTruthy();
  const product = await productResponse.json();
  expect(product.sku).toBe(productPayload.sku);

  const invoicePayload = {
    invoiceNo: `INV-E2E-${uniqueSuffix}`,
    customerId: customer.id,
    status: 'issued',
    discountCents: 600,
    taxCents: 300,
    items: [
      {
        productId: product.id,
        quantity: 3,
        unitPriceCents: product.unitPriceCents,
        description: product.description
      }
    ]
  };

  const invoiceResponse = await request.post('invoices', { data: invoicePayload });
  expect(invoiceResponse.ok()).toBeTruthy();
  const invoice = await invoiceResponse.json();
  expect(invoice.invoiceNo).toBe(invoicePayload.invoiceNo);
  const expectedGrandTotal = 3 * product.unitPriceCents - invoicePayload.discountCents + invoicePayload.taxCents;
  expect(invoice.grandTotalCents).toBe(expectedGrandTotal);

  const paymentPayload = {
    customerId: customer.id,
    invoiceId: invoice.id,
    amountCents: Math.trunc(expectedGrandTotal / 2),
    method: 'card',
    note: 'Playwright partial payment'
  };

  const paymentResponse = await request.post('payments', { data: paymentPayload });
  expect(paymentResponse.ok()).toBeTruthy();
  const payment = await paymentResponse.json();
  expect(payment.amountCents).toBe(paymentPayload.amountCents);

  const ledgerResponse = await request.get(`customers/${customer.id}/ledger`);
  expect(ledgerResponse.ok()).toBeTruthy();
  const ledger = await ledgerResponse.json();
  expect(ledger.customerId).toBe(customer.id);
  expect(ledger.balanceCents).toBe(expectedGrandTotal - paymentPayload.amountCents);

  const duesResponse = await request.get('reports/dues');
  expect(duesResponse.ok()).toBeTruthy();
  const duesReport = await duesResponse.json();
  const entry = duesReport.customers.find((item: { customerId: number }) => item.customerId === customer.id);
  expect(entry?.balanceCents).toBe(ledger.balanceCents);

  const paymentsReport = await request.get('reports/payments');
  expect(paymentsReport.ok()).toBeTruthy();
  const paymentsLedger = await paymentsReport.json();
  expect(paymentsLedger.entries.some((item: { invoiceId: number }) => item.invoiceId === invoice.id)).toBe(true);

  const invoicePdfResponse = await request.post(`invoices/${invoice.id}/pdf`, {
    data: { currency: 'usd', variant: 'a4' }
  });
  expect(invoicePdfResponse.ok()).toBeTruthy();
  const invoiceHeaders = invoicePdfResponse.headers();
  expect(invoiceHeaders['content-type']).toBe('application/pdf');
  expect(invoiceHeaders['content-disposition']).toContain('attachment');
  const invoicePdf = await invoicePdfResponse.body();
  await testInfo.attach('invoice-pdf', { body: invoicePdf, contentType: 'application/pdf' });

  const duesPdfResponse = await request.get('reports/dues.pdf');
  expect(duesPdfResponse.ok()).toBeTruthy();
  const duesHeaders = duesPdfResponse.headers();
  expect(duesHeaders['content-type']).toBe('application/pdf');
  const duesPdf = await duesPdfResponse.body();
  await testInfo.attach('dues-report', { body: duesPdf, contentType: 'application/pdf' });
});
