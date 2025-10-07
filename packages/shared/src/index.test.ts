import { describe, expect, it } from 'vitest';

import {
  customerCreateSchema,
  customerUpdateSchema,
  duesReportSchema,
  exampleCustomerCreate,
  exampleDuesReport,
  exampleInvoice,
  exampleInvoiceCreate,
  examplePayment,
  examplePaymentCreate,
  exampleProduct,
  exampleProductCreate,
  exampleSalesReport,
  healthCheckExample,
  healthCheckSchema,
  invoiceCreateSchema,
  invoiceSchema,
  paymentCreateSchema,
  paymentSchema,
  productCreateSchema,
  productSchema,
  salesReportQuerySchema,
  salesReportSchema
} from './index.js';

describe('shared schemas', () => {
  it('accepts the documented customer example', () => {
    expect(() => customerCreateSchema.parse(exampleCustomerCreate)).not.toThrow();
  });

  it('rejects empty customer updates', () => {
    expect(() => customerUpdateSchema.parse({})).toThrowError(
      /At least one field must be provided to update a customer/
    );
  });

  it('accepts the documented product example', () => {
    expect(() => productCreateSchema.parse(exampleProductCreate)).not.toThrow();
    expect(() => productSchema.parse(exampleProduct)).not.toThrow();
  });

  it('validates invoice payloads and relations', () => {
    expect(() => invoiceCreateSchema.parse(exampleInvoiceCreate)).not.toThrow();
    expect(() => invoiceSchema.parse(exampleInvoice)).not.toThrow();
  });

  it('validates payment payloads', () => {
    expect(() => paymentCreateSchema.parse(examplePaymentCreate)).not.toThrow();
    expect(() => paymentSchema.parse(examplePayment)).not.toThrow();
  });

  it('validates health and report documents used in docs', () => {
    expect(() => healthCheckSchema.parse(healthCheckExample)).not.toThrow();
    expect(() => duesReportSchema.parse(exampleDuesReport)).not.toThrow();
    expect(() => salesReportSchema.parse(exampleSalesReport)).not.toThrow();
  });

  it('applies default grouping in sales report query', () => {
    const result = salesReportQuerySchema.parse({});
    expect(result.groupBy).toBe('month');
  });
});
