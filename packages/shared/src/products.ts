import { z } from 'zod';
import {
  dateTimeStringSchema,
  idSchema,
  listQuerySchema,
  moneyCentsSchema,
  paginationSchema
} from './common.js';

export const productSchema = z.object({
  id: idSchema,
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).optional(),
  unitPriceCents: moneyCentsSchema,
  stockQty: z.number().int().min(0),
  createdAt: dateTimeStringSchema
});

export const productCreateSchema = productSchema
  .omit({ id: true, createdAt: true })
  .strict();

export const productUpdateSchema = productCreateSchema.partial().refine(
  data => Object.keys(data).length > 0,
  'At least one field must be provided to update a product'
);

export const productListQuerySchema = listQuerySchema.extend({
  sort: z.enum(['createdAt', 'name', 'sku']).default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc')
});

export const productListResponseSchema = z.object({
  data: z.array(productSchema),
  pagination: paginationSchema
});

export type Product = z.infer<typeof productSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type ProductListResponse = z.infer<typeof productListResponseSchema>;

export const exampleProductCreate: ProductCreateInput = {
  sku: 'PAPER-A4-80',
  name: 'A4 Copy Paper 80gsm',
  description: 'Standard office copy paper.',
  unitPriceCents: 549,
  stockQty: 120
};

export const exampleProduct: Product = {
  id: 1,
  ...exampleProductCreate,
  createdAt: '2024-01-01T00:00:00.000Z'
};
