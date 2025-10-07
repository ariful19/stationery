import { z } from 'zod';

export const idSchema = z.number().int().positive();

export const dateTimeStringSchema = z
  .string()
  .min(1)
  .refine(value => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid date-time value'
  });

export const dateOnlyStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Date must be in YYYY-MM-DD format');

export const moneyCentsSchema = z.number().int().min(0);

export const paginationSchema = z.object({
  total: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0)
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  query: z.string().trim().min(1).max(120).optional()
});

export type Pagination = z.infer<typeof paginationSchema>;
