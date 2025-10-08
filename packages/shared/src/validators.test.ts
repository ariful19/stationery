import { describe, expect, it } from 'vitest';

import { dateTimeStringSchema, idSchema, listQuerySchema } from './common.js';
import { customerCreateSchema, customerUpdateSchema } from './customers.js';
import { invoiceCreateSchema, invoicePdfRequestSchema } from './invoices.js';
import { paymentCreateSchema, paymentListQuerySchema } from './payments.js';
import { productUpdateSchema } from './products.js';

describe('shared validators', () => {
  it('rejects non-positive identifiers', () => {
    expect(() => idSchema.parse(0)).toThrowError(/greater than 0/);
    expect(() => idSchema.parse(-5)).toThrowError(/greater than 0/);
    expect(idSchema.parse(42)).toBe(42);
  });

  it('validates ISO date strings strictly', () => {
    const parsed = dateTimeStringSchema.parse('2024-04-01T10:30:00.000Z');
    expect(parsed).toBe('2024-04-01T10:30:00.000Z');
    expect(() => dateTimeStringSchema.parse('not-a-date')).toThrowError(/Invalid date-time value/);
  });

  it('applies list query defaults and trimming', () => {
    const defaults = listQuerySchema.parse({});
    expect(defaults.limit).toBe(20);
    expect(defaults.offset).toBe(0);
    const trimmed = listQuerySchema.parse({ limit: '10', offset: '5', query: '  hello  ' });
    expect(trimmed.query).toBe('hello');
  });

  it('enforces customer and product update rules', () => {
    expect(() =>
      customerCreateSchema.parse({
        name: 'Test',
        email: 'user@test.dev',
        phone: 'invalid',
        address: '1',
      }),
    ).toThrow();
    expect(customerUpdateSchema.safeParse({}).success).toBe(false);
    expect(productUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('requires invoices to include at least one item', () => {
    expect(() =>
      invoiceCreateSchema.parse({ customerId: 1, items: [], status: 'issued' }),
    ).toThrowError(/at least 1 element/);
  });

  it('normalizes invoice pdf request branding and currency', () => {
    const parsed = invoicePdfRequestSchema.parse({
      currency: 'eur',
      brand: { companyAddress: 'Line A', footerLines: ['Thanks'] },
    });
    expect(parsed.currency).toBe('EUR');
    expect(parsed.brand?.companyAddress).toEqual(['Line A']);
    expect(parsed.brand?.footerLines).toEqual(['Thanks']);
  });

  it('permits optional paidAt while enforcing payment constraints', () => {
    const parsed = paymentCreateSchema.parse({ customerId: 1, amountCents: 1500, method: 'cash' });
    expect(parsed.paidAt).toBeUndefined();
    expect(() =>
      paymentCreateSchema.parse({ customerId: 1, amountCents: 0, method: 'cash' }),
    ).toThrow();

    const list = paymentListQuerySchema.parse({ from: '2024-01-01', to: '2024-01-31' });
    expect(list.direction).toBe('desc');
    expect(list.sort).toBe('paidAt');
  });
});
