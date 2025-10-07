import { z } from 'zod';
import { dateOnlyStringSchema, moneyCentsSchema } from './common.js';
import { customerLedgerSchema, exampleCustomerLedger } from './customers.js';

export const duesReportSchema = z.object({
  customers: z.array(customerLedgerSchema),
  generatedAt: z.string()
});

export type DuesReport = z.infer<typeof duesReportSchema>;

export const exampleDuesReport: DuesReport = {
  generatedAt: '2024-01-07T00:00:00.000Z',
  customers: [exampleCustomerLedger]
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
  generatedAt: z.string()
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
  ]
};
