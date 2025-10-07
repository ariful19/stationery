import { z } from 'zod';
import { dateOnlyStringSchema, moneyCentsSchema } from './common.js';
import { customerLedgerSchema, exampleCustomerLedger } from './customers.js';
import { paymentSchema } from './payments.js';

export const duesReportQuerySchema = z.object({
  customerId: z.number().int().positive().optional(),
  minBalanceCents: moneyCentsSchema.optional(),
  search: z
    .string()
    .trim()
    .min(1)
    .optional()
});

export const duesReportSchema = z.object({
  customers: z.array(customerLedgerSchema),
  generatedAt: z.string(),
  summary: z.object({
    customersCount: z.number().int().min(0),
    totalInvoicedCents: moneyCentsSchema,
    totalPaidCents: moneyCentsSchema,
    totalBalanceCents: moneyCentsSchema
  })
});

export type DuesReport = z.infer<typeof duesReportSchema>;
export type DuesReportQuery = z.infer<typeof duesReportQuerySchema>;

export const exampleDuesReport: DuesReport = {
  generatedAt: '2024-01-07T00:00:00.000Z',
  customers: [exampleCustomerLedger],
  summary: {
    customersCount: 1,
    totalInvoicedCents: exampleCustomerLedger.invoicedCents,
    totalPaidCents: exampleCustomerLedger.paidCents,
    totalBalanceCents: exampleCustomerLedger.balanceCents
  }
};

export const salesReportQuerySchema = z.object({
  from: dateOnlyStringSchema.optional(),
  to: dateOnlyStringSchema.optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('month')
});

export const salesReportRowSchema = z.object({
  period: z.string(),
  invoicesCount: z.number().int().min(0),
  totalCents: moneyCentsSchema
});

export const salesReportSchema = z.object({
  rows: z.array(salesReportRowSchema),
  generatedAt: z.string(),
  summary: z.object({
    totalInvoicesCount: z.number().int().min(0),
    totalCents: moneyCentsSchema
  })
});

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
export type SalesReportRow = z.infer<typeof salesReportRowSchema>;
export type SalesReport = z.infer<typeof salesReportSchema>;

export const exampleSalesReport: SalesReport = {
  generatedAt: '2024-01-07T00:00:00.000Z',
  rows: [
    {
      period: '2024-01',
      invoicesCount: 3,
      totalCents: 42000
    }
  ],
  summary: {
    totalInvoicesCount: 3,
    totalCents: 42000
  }
};

export const paymentsLedgerQuerySchema = z.object({
  from: dateOnlyStringSchema.optional(),
  to: dateOnlyStringSchema.optional(),
  customerId: z.number().int().positive().optional(),
  invoiceId: z.number().int().positive().optional(),
  direction: z.enum(['asc', 'desc']).default('desc')
});

export const paymentsLedgerEntrySchema = paymentSchema
  .omit({ note: true })
  .extend({
    note: z.string().trim().max(240).nullish(),
    customerName: z.string(),
    invoiceNo: z.string().nullish(),
    runningBalanceCents: moneyCentsSchema
  });

export const paymentsLedgerSchema = z.object({
  entries: z.array(paymentsLedgerEntrySchema),
  generatedAt: z.string(),
  summary: z.object({
    entriesCount: z.number().int().min(0),
    totalPaidCents: moneyCentsSchema,
    firstPaymentAt: z.string().nullable(),
    lastPaymentAt: z.string().nullable()
  })
});

export type PaymentsLedgerQuery = z.infer<typeof paymentsLedgerQuerySchema>;
export type PaymentsLedgerEntry = z.infer<typeof paymentsLedgerEntrySchema>;
export type PaymentsLedger = z.infer<typeof paymentsLedgerSchema>;

export const examplePaymentsLedger: PaymentsLedger = {
  generatedAt: '2024-01-07T00:00:00.000Z',
  entries: [
    {
      id: 1,
      customerId: 10,
      customerName: 'Acme Office Supplies',
      invoiceId: 22,
      invoiceNo: 'INV-00022',
      amountCents: 21500,
      method: 'card',
      paidAt: '2024-01-02T15:22:00.000Z',
      note: null,
      runningBalanceCents: 21500
    }
  ],
  summary: {
    entriesCount: 1,
    totalPaidCents: 21500,
    firstPaymentAt: '2024-01-02T15:22:00.000Z',
    lastPaymentAt: '2024-01-02T15:22:00.000Z'
  }
};
