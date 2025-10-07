import { z } from 'zod';
import {
  dateOnlyStringSchema,
  dateTimeStringSchema,
  idSchema,
  listQuerySchema,
  moneyCentsSchema,
  paginationSchema
} from './common.js';
import { customerSchema, exampleCustomer } from './customers.js';
import { examplePayment, paymentSchema } from './payments.js';
import { exampleProduct } from './products.js';

export const invoiceStatusSchema = z.enum(['draft', 'issued', 'partial', 'paid', 'void']);

export const invoiceItemInputSchema = z.object({
  productId: idSchema,
  description: z.string().trim().max(240).optional(),
  quantity: z.number().int().min(1),
  unitPriceCents: moneyCentsSchema
});

export const invoiceItemSchema = invoiceItemInputSchema.extend({
  id: idSchema,
  invoiceId: idSchema,
  lineTotalCents: moneyCentsSchema,
  description: z.string().trim().max(240).nullable().optional()
});

export const invoiceBaseSchema = z.object({
  id: idSchema,
  invoiceNo: z.string().trim().min(1).max(64),
  customerId: idSchema,
  issueDate: dateTimeStringSchema,
  subTotalCents: moneyCentsSchema,
  discountCents: moneyCentsSchema,
  taxCents: moneyCentsSchema,
  grandTotalCents: moneyCentsSchema,
  status: invoiceStatusSchema,
  notes: z.string().trim().max(500).nullable().optional()
});

export const invoiceSchema = invoiceBaseSchema.extend({
  customer: customerSchema.optional(),
  items: z.array(invoiceItemSchema),
  payments: z.array(paymentSchema)
});

export const invoiceCreateSchema = z
  .object({
    invoiceNo: z.string().trim().min(1).max(64).optional(),
    customerId: idSchema,
    issueDate: dateTimeStringSchema.optional(),
    status: invoiceStatusSchema.default('draft'),
    discountCents: moneyCentsSchema.default(0),
    taxCents: moneyCentsSchema.default(0),
    notes: z.string().trim().max(500).optional(),
    items: z.array(invoiceItemInputSchema).min(1)
  })
  .strict();

export const invoiceListQuerySchema = listQuerySchema.extend({
  status: z.array(invoiceStatusSchema).or(invoiceStatusSchema).optional(),
  customerId: z.coerce.number().int().positive().optional(),
  from: dateOnlyStringSchema.optional(),
  to: dateOnlyStringSchema.optional(),
  sort: z.enum(['issueDate', 'invoiceNo']).default('issueDate'),
  direction: z.enum(['asc', 'desc']).default('desc')
});

export const invoiceListResponseSchema = z.object({
  data: z.array(invoiceSchema),
  pagination: paginationSchema
});

export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
export type InvoiceListResponse = z.infer<typeof invoiceListResponseSchema>;

export const exampleInvoiceCreate: InvoiceCreateInput = {
  customerId: exampleCustomer.id,
  invoiceNo: 'INV-2024-0001',
  status: 'issued',
  discountCents: 0,
  taxCents: 500,
  notes: 'Thank you for your business!',
  items: [
    {
      productId: exampleProduct.id,
      quantity: 2,
      unitPriceCents: exampleProduct.unitPriceCents,
      description: exampleProduct.description
    }
  ]
};

export const exampleInvoice: Invoice = {
  id: 1,
  customerId: exampleCustomer.id,
  invoiceNo: exampleInvoiceCreate.invoiceNo!,
  issueDate: '2024-01-05T00:00:00.000Z',
  subTotalCents: exampleProduct.unitPriceCents * 2,
  discountCents: exampleInvoiceCreate.discountCents,
  taxCents: exampleInvoiceCreate.taxCents,
  grandTotalCents:
    exampleProduct.unitPriceCents * 2 - exampleInvoiceCreate.discountCents + exampleInvoiceCreate.taxCents,
  status: exampleInvoiceCreate.status,
  notes: exampleInvoiceCreate.notes,
  customer: exampleCustomer,
  items: [
    {
      id: 1,
      invoiceId: 1,
      productId: exampleProduct.id,
      quantity: 2,
      unitPriceCents: exampleProduct.unitPriceCents,
      lineTotalCents: exampleProduct.unitPriceCents * 2,
      description: exampleProduct.description
    }
  ],
  payments: [examplePayment]
};
