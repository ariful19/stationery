import {
  customerCreateSchema,
  customerListQuerySchema,
  customerListResponseSchema,
  customerSchema,
  duesReportSchema,
  invoiceCreateSchema,
  invoiceListQuerySchema,
  invoiceListResponseSchema,
  invoiceSchema,
  paymentCreateSchema,
  paymentListQuerySchema,
  paymentListResponseSchema,
  paymentSchema,
  productCreateSchema,
  productListQuerySchema,
  productListResponseSchema,
  productSchema,
  salesReportQuerySchema,
  salesReportSchema,
  type Customer,
  type CustomerCreateInput,
  type CustomerListQuery,
  type CustomerListResponse,
  type Invoice,
  type InvoiceCreateInput,
  type InvoiceListQuery,
  type InvoiceListResponse,
  type Payment,
  type PaymentCreateInput,
  type PaymentListQuery,
  type PaymentListResponse,
  type Product,
  type ProductCreateInput,
  type ProductListQuery,
  type ProductListResponse,
  type DuesReport,
  type SalesReport,
  type SalesReportQuery
} from '@stationery/shared';
import { z } from 'zod';

const API_BASE = '/api/v1';

const jsonHeaders = { 'Content-Type': 'application/json' } as const;

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

const buildUrl = (path: string, query?: Query) => {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }
  return url;
};

const parseResponse = async <T>(response: Response, schema: z.ZodType<T> | null) => {
  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  if (!text) {
    return null as T;
  }

  const data = JSON.parse(text);
  if (!schema) {
    return data as T;
  }
  return schema.parse(data);
};

const request = async <T>(path: string, options: RequestInit & { query?: Query; schema?: z.ZodType<T> | null }) => {
  const { query, schema = null, ...init } = options;
  const url = buildUrl(path, query);
  const response = await fetch(url, init);

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch (error) {
      details = undefined;
    }
    throw new ApiClientError(response.statusText || 'Request failed', response.status, details);
  }

  return parseResponse(response, schema);
};

export const fetchCustomers = async (query: CustomerListQuery = {}) =>
  request<CustomerListResponse>('/customers', {
    method: 'GET',
    query: customerListQuerySchema.parse(query),
    schema: customerListResponseSchema
  });

export const createCustomer = async (input: CustomerCreateInput) =>
  request<Customer>('/customers', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(customerCreateSchema.parse(input)),
    schema: customerSchema
  });

export const fetchCustomer = async (id: number) =>
  request<Customer>(`/customers/${id}`, {
    method: 'GET',
    schema: customerSchema
  });

export const fetchProducts = async (query: ProductListQuery = {}) =>
  request<ProductListResponse>('/products', {
    method: 'GET',
    query: productListQuerySchema.parse(query),
    schema: productListResponseSchema
  });

export const createProduct = async (input: ProductCreateInput) =>
  request<Product>('/products', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(productCreateSchema.parse(input)),
    schema: productSchema
  });

export const createInvoice = async (input: InvoiceCreateInput) =>
  request<Invoice>('/invoices', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(invoiceCreateSchema.parse(input)),
    schema: invoiceSchema
  });

export const fetchInvoice = async (id: number) =>
  request<Invoice>(`/invoices/${id}`, {
    method: 'GET',
    schema: invoiceSchema
  });

export const fetchInvoices = async (query: InvoiceListQuery = {}) =>
  request<InvoiceListResponse>('/invoices', {
    method: 'GET',
    query: invoiceListQuerySchema.parse(query),
    schema: invoiceListResponseSchema
  });

export const createPayment = async (input: PaymentCreateInput) =>
  request<Payment>('/payments', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(paymentCreateSchema.parse(input)),
    schema: paymentSchema
  });

export const fetchPayments = async (query: PaymentListQuery = {}) =>
  request<PaymentListResponse>('/payments', {
    method: 'GET',
    query: paymentListQuerySchema.parse(query),
    schema: paymentListResponseSchema
  });

export const fetchDuesReport = async () =>
  request<DuesReport>('/reports/dues', {
    method: 'GET',
    schema: duesReportSchema
  });

export const fetchSalesReport = async (query: SalesReportQuery) =>
  request<SalesReport>('/reports/sales', {
    method: 'GET',
    query: salesReportQuerySchema.parse(query),
    schema: salesReportSchema
  });

export const requestInvoicePdf = async (invoiceId: number, payload?: Record<string, unknown>) => {
  const response = await fetch(buildUrl(`/invoices/${invoiceId}/pdf`), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload ?? {})
  });

  if (!response.ok) {
    throw new ApiClientError(response.statusText || 'Failed to load PDF', response.status);
  }

  return response.blob();
};

export type {
  Customer,
  CustomerCreateInput,
  CustomerListResponse,
  Product,
  ProductCreateInput,
  ProductListResponse,
  Invoice,
  InvoiceCreateInput,
  InvoiceListResponse,
  Payment,
  PaymentCreateInput,
  PaymentListResponse,
  DuesReport,
  SalesReport,
  SalesReportQuery
};
