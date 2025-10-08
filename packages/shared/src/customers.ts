import { z } from 'zod';

import {
  dateTimeStringSchema,
  idSchema,
  listQuerySchema,
  moneyCentsSchema,
  paginationSchema,
} from './common.js';

const phoneRegex = /^[+0-9()\-\s]{7,20}$/;

export const customerSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .regex(
      phoneRegex,
      'Phone numbers may contain digits, spaces, dashes, parentheses or a leading +',
    )
    .optional(),
  email: z.string().trim().email().optional(),
  address: z.string().trim().max(240).optional(),
  createdAt: dateTimeStringSchema,
});

export const customerCreateSchema = customerSchema.omit({ id: true, createdAt: true }).strict();

export const customerUpdateSchema = customerCreateSchema
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be provided to update a customer',
  );

export const customerListQuerySchema = listQuerySchema.extend({
  sort: z.enum(['createdAt', 'name']).default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export const customerListResponseSchema = z.object({
  data: z.array(customerSchema),
  pagination: paginationSchema,
});

export const customerLedgerSchema = z.object({
  customerId: idSchema,
  customerName: z.string().min(1),
  invoicedCents: moneyCentsSchema,
  paidCents: moneyCentsSchema,
  balanceCents: z.number().int(),
});

export type Customer = z.infer<typeof customerSchema>;
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
export type CustomerListResponse = z.infer<typeof customerListResponseSchema>;
export type CustomerLedger = z.infer<typeof customerLedgerSchema>;

export const exampleCustomerCreate: CustomerCreateInput = {
  name: 'Acme Studios',
  email: 'team@acme.test',
  phone: '+1 555 123 4567',
  address: '42 Paper Street',
};

export const exampleCustomer: Customer = {
  id: 1,
  ...exampleCustomerCreate,
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const exampleCustomerLedger: CustomerLedger = {
  customerId: 1,
  customerName: exampleCustomerCreate.name,
  invoicedCents: 12500,
  paidCents: 7500,
  balanceCents: 5000,
};
