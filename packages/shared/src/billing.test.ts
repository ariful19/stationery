import { describe, expect, it } from 'vitest';
import {
  buildInvoiceNumber,
  calculateCustomerDueCents,
  calculateInvoiceTotals,
  resolveInvoiceSeriesKey,
  roundValue,
  type InvoiceLineInput
} from './billing.js';

describe('roundValue', () => {
  const roundingCases: Array<[
    string,
    number,
    Parameters<typeof roundValue>[1],
    number
  ]> = [
    ['half-even positive', 1.235, { decimals: 2, mode: 'HALF_EVEN' }, 1.24],
    ['half-even negative', -1.235, { decimals: 2, mode: 'HALF_EVEN' }, -1.24],
    ['half-up exact half', 1.235, { decimals: 2, mode: 'HALF_UP' }, 1.24],
    ['half-down exact half', 1.235, { decimals: 2, mode: 'HALF_DOWN' }, 1.23],
    ['truncate', 1.239, { decimals: 2, mode: 'TRUNCATE' }, 1.23],
    ['ceil negative', -1.231, { decimals: 2, mode: 'CEIL' }, -1.23],
    ['floor positive', 1.239, { decimals: 2, mode: 'FLOOR' }, 1.23]
  ];

  it.each(roundingCases)('%s', (_, value, config, expected) => {
    expect(roundValue(value, config)).toBe(expected);
  });
});

describe('buildInvoiceNumber', () => {
  it('uses defaults when config is omitted', () => {
    const date = new Date('2024-02-15T00:00:00Z');
    expect(buildInvoiceNumber(7, date)).toBe('INV-202402-0007');
  });

  it('supports custom prefix and formatter', () => {
    const date = new Date('2025-12-05T10:30:00Z');
    const invoice = buildInvoiceNumber(82, date, {
      prefix: 'STA',
      sequencePadding: 6,
      dateFormatter: value =>
        `${value.getUTCFullYear()}-${String(value.getUTCDate()).padStart(2, '0')}`
    });

    expect(invoice).toBe('STA-2025-05-000082');
  });

  it('exposes the series key used for querying existing invoices', () => {
    const date = new Date('2023-07-01T00:00:00Z');
    expect(resolveInvoiceSeriesKey(date, { prefix: 'BILL' })).toBe('BILL-202307');
  });
});

describe('calculateInvoiceTotals', () => {
  const rounding = { decimals: 0, mode: 'HALF_EVEN' } as const;

  it('handles zero and negative quantities gracefully', () => {
    const items: InvoiceLineInput[] = [
      { quantity: 0, unitPriceCents: 4000 },
      { quantity: -1.5, unitPriceCents: 2500 }
    ];

    const totals = calculateInvoiceTotals(
      { items, discountCents: 500, taxRate: 0.1 },
      rounding
    );

    expect(totals).toMatchInlineSnapshot(`
      {
        "discountCents": 500,
        "grandTotalCents": -4675,
        "items": [
          {
            "lineTotalCents": 0,
            "quantity": 0,
            "unitPriceCents": 4000,
          },
          {
            "lineTotalCents": -3750,
            "quantity": -1.5,
            "unitPriceCents": 2500,
          },
        ],
        "subTotalCents": -3750,
        "taxCents": -425,
      }
    `);
  });

  it('prefers explicit tax cents over tax rate', () => {
    const totals = calculateInvoiceTotals(
      {
        items: [
          { quantity: 2, unitPriceCents: 999 },
          { quantity: 1.234, unitPriceCents: 1999 }
        ],
        discountCents: 300,
        taxRate: 0.2,
        taxCents: 145
      },
      rounding
    );

    expect(totals.taxCents).toBe(145);
  });

  it('computes large totals with deterministic rounding', () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      quantity: 3.1415 + index,
      unitPriceCents: 1299 + index
    }));

    const totals = calculateInvoiceTotals(
      {
        items,
        discountCents: 250_000,
        taxRate: 0.175
      },
      rounding
    );

    expect(totals).toMatchSnapshot();
  });
});

describe('calculateCustomerDueCents', () => {
  it('rounds to cent precision', () => {
    expect(calculateCustomerDueCents(10050, 9950.4, { decimals: 0 })).toBe(100);
  });

  it('handles overpayments', () => {
    expect(calculateCustomerDueCents(5000, 7500, { decimals: 0 })).toBe(-2500);
  });
});
