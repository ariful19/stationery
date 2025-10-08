import { z } from 'zod';

import {
  dateOnlyStringSchema,
  dateTimeStringSchema,
  idSchema,
  listQuerySchema,
  moneyCentsSchema,
  paginationSchema,
} from './common.js';

export const paymentMethodSchema = z.enum(['cash', 'bkash', 'card', 'other']);

export const paymentSchema = z.object({
  id: idSchema,
  customerId: idSchema,
  invoiceId: idSchema.nullish(),
  amountCents: moneyCentsSchema.min(1),
  method: paymentMethodSchema,
  paidAt: dateTimeStringSchema,
  note: z.string().trim().max(240).optional(),
});

export const paymentCreateSchema = paymentSchema
  .omit({ id: true, paidAt: true })
  .extend({
    paidAt: dateTimeStringSchema.optional(),
  })
  .strict();

export const paymentListQuerySchema = listQuerySchema.extend({
  customerId: z.coerce.number().int().positive().optional(),
  invoiceId: z.coerce.number().int().positive().optional(),
  from: dateOnlyStringSchema.optional(),
  to: dateOnlyStringSchema.optional(),
  sort: z.enum(['paidAt']).default('paidAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export const paymentListResponseSchema = z.object({
  data: z.array(paymentSchema),
  pagination: paginationSchema,
});

export type Payment = z.infer<typeof paymentSchema>;
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;
export type PaymentListResponse = z.infer<typeof paymentListResponseSchema>;

export const examplePaymentCreate: PaymentCreateInput = {
  customerId: 1,
  invoiceId: 1,
  amountCents: 5000,
  method: 'cash',
  note: 'Deposit payment',
};

export const examplePayment: Payment = {
  id: 1,
  ...examplePaymentCreate,
  paidAt: '2024-01-02T00:00:00.000Z',
};
