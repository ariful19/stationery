import {
  type Customer,
  type CustomerCreateInput,
  customerCreateSchema,
  type CustomerListQuery,
  customerListQuerySchema,
  type CustomerListResponse,
  customerListResponseSchema,
  customerSchema,
  type DuesReport,
  type DuesReportQuery,
  duesReportQuerySchema,
  duesReportSchema,
  type Invoice,
  type InvoiceCreateInput,
  invoiceCreateSchema,
  type InvoiceListQuery,
  invoiceListQuerySchema,
  type InvoiceListResponse,
  invoiceListResponseSchema,
  invoiceSchema,
  type Payment,
  type PaymentCreateInput,
  paymentCreateSchema,
  type PaymentListQuery,
  paymentListQuerySchema,
  type PaymentListResponse,
  paymentListResponseSchema,
  paymentSchema,
  type PaymentsLedger,
  type PaymentsLedgerQuery,
  paymentsLedgerQuerySchema,
  paymentsLedgerSchema,
  type Product,
  type ProductCreateInput,
  productCreateSchema,
  type ProductListQuery,
  productListQuerySchema,
  type ProductListResponse,
  productListResponseSchema,
  productSchema,
  type ProductUpdateInput,
  productUpdateSchema,
  type SalesReport,
  type SalesReportQuery,
  salesReportQuerySchema,
  salesReportSchema,
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

const request = async <T>(
  path: string,
  options: RequestInit & { query?: Query; schema?: z.ZodType<T> | null },
) => {
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
    schema: customerListResponseSchema,
  });

export const createCustomer = async (input: CustomerCreateInput) =>
  request<Customer>('/customers', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(customerCreateSchema.parse(input)),
    schema: customerSchema,
  });

export const fetchCustomer = async (id: number) =>
  request<Customer>(`/customers/${id}`, {
    method: 'GET',
    schema: customerSchema,
  });

export const fetchProducts = async (query: ProductListQuery = {}) =>
  request<ProductListResponse>('/products', {
    method: 'GET',
    query: productListQuerySchema.parse(query),
    schema: productListResponseSchema,
  });

export const createProduct = async (input: ProductCreateInput) =>
  request<Product>('/products', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(productCreateSchema.parse(input)),
    schema: productSchema,
  });

export const updateProduct = async (id: number, input: ProductUpdateInput) =>
  request<Product>(`/products/${id}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(productUpdateSchema.parse(input)),
    schema: productSchema,
  });

export const createInvoice = async (input: InvoiceCreateInput) =>
  request<Invoice>('/invoices', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(invoiceCreateSchema.parse(input)),
    schema: invoiceSchema,
  });

export const fetchInvoice = async (id: number) =>
  request<Invoice>(`/invoices/${id}`, {
    method: 'GET',
    schema: invoiceSchema,
  });

export const fetchInvoices = async (query: InvoiceListQuery = {}) =>
  request<InvoiceListResponse>('/invoices', {
    method: 'GET',
    query: invoiceListQuerySchema.parse(query),
    schema: invoiceListResponseSchema,
  });

export const createPayment = async (input: PaymentCreateInput) =>
  request<Payment>('/payments', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(paymentCreateSchema.parse(input)),
    schema: paymentSchema,
  });

export const fetchPayments = async (query: PaymentListQuery = {}) =>
  request<PaymentListResponse>('/payments', {
    method: 'GET',
    query: paymentListQuerySchema.parse(query),
    schema: paymentListResponseSchema,
  });

export const fetchDuesReport = async (query: DuesReportQuery = {}) =>
  request<DuesReport>('/reports/dues', {
    method: 'GET',
    query: duesReportQuerySchema.parse(query),
    schema: duesReportSchema,
  });

export const fetchSalesReport = async (query: SalesReportQuery) =>
  request<SalesReport>('/reports/sales', {
    method: 'GET',
    query: salesReportQuerySchema.parse(query),
    schema: salesReportSchema,
  });

export const fetchPaymentsLedger = async (query: PaymentsLedgerQuery = {}) =>
  request<PaymentsLedger>('/reports/payments', {
    method: 'GET',
    query: paymentsLedgerQuerySchema.parse(query),
    schema: paymentsLedgerSchema,
  });

const downloadReport = async (path: string, query?: Record<string, unknown>) => {
  const normalizedQuery = query
    ? (Object.fromEntries(
        Object.entries(query).map(([key, value]) => [
          key,
          value as string | number | boolean | undefined | null,
        ]),
      ) as Query)
    : undefined;
  const url = buildUrl(path, normalizedQuery);
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new ApiClientError(response.statusText || 'Failed to download report', response.status);
  }
  return response.blob();
};

export const downloadDuesReportCsv = (query: DuesReportQuery = {}) =>
  downloadReport('/reports/dues.csv', duesReportQuerySchema.parse(query));

export const downloadDuesReportPdf = (query: DuesReportQuery = {}) =>
  downloadReport('/reports/dues.pdf', duesReportQuerySchema.parse(query));

export const downloadSalesReportCsv = (query: SalesReportQuery) =>
  downloadReport('/reports/sales.csv', salesReportQuerySchema.parse(query));

export const downloadSalesReportPdf = (query: SalesReportQuery) =>
  downloadReport('/reports/sales.pdf', salesReportQuerySchema.parse(query));

export const downloadPaymentsLedgerCsv = (query: PaymentsLedgerQuery = {}) =>
  downloadReport('/reports/payments.csv', paymentsLedgerQuerySchema.parse(query));

export const downloadPaymentsLedgerPdf = (query: PaymentsLedgerQuery = {}) =>
  downloadReport('/reports/payments.pdf', paymentsLedgerQuerySchema.parse(query));

export const requestInvoicePdf = async (invoiceId: number, payload?: Record<string, unknown>) => {
  const response = await fetch(buildUrl(`/invoices/${invoiceId}/pdf`), {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload ?? {}),
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
  DuesReport,
  DuesReportQuery,
  Invoice,
  InvoiceCreateInput,
  InvoiceListResponse,
  Payment,
  PaymentCreateInput,
  PaymentListResponse,
  PaymentsLedger,
  PaymentsLedgerQuery,
  Product,
  ProductCreateInput,
  ProductListResponse,
  SalesReport,
  SalesReportQuery,
};
