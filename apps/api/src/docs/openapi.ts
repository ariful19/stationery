import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import {
  customerCreateSchema,
  customerLedgerSchema,
  customerListQuerySchema,
  customerListResponseSchema,
  customerSchema,
  duesReportQuerySchema,
  duesReportSchema,
  exampleCustomer,
  exampleCustomerCreate,
  exampleCustomerLedger,
  exampleDuesReport,
  exampleInvoice,
  exampleInvoiceCreate,
  exampleInvoicePdfRequest,
  examplePayment,
  examplePaymentCreate,
  examplePaymentsLedger,
  exampleProduct,
  exampleProductCreate,
  exampleSalesReport,
  healthCheckExample,
  healthCheckSchema,
  invoiceCreateSchema,
  invoiceListQuerySchema,
  invoiceListResponseSchema,
  invoiceSchema,
  invoicePdfRequestSchema,
  paymentCreateSchema,
  paymentListQuerySchema,
  paymentListResponseSchema,
  paymentSchema,
  productCreateSchema,
  productListQuerySchema,
  productListResponseSchema,
  productSchema,
  paymentsLedgerQuerySchema,
  paymentsLedgerSchema,
  salesReportQuerySchema,
  salesReportSchema
} from '@stationery/shared';
import { z } from 'zod';

extendZodWithOpenApi(z);

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional()
});

const registry = new OpenAPIRegistry();

registry.register('Error', errorSchema);
registry.register('HealthResponse', healthCheckSchema);
registry.register('Customer', customerSchema);
registry.register('CustomerCreate', customerCreateSchema);
registry.register('CustomerListResponse', customerListResponseSchema);
registry.register('CustomerLedger', customerLedgerSchema);
registry.register('Product', productSchema);
registry.register('ProductCreate', productCreateSchema);
registry.register('ProductListResponse', productListResponseSchema);
registry.register('Invoice', invoiceSchema);
registry.register('InvoiceCreate', invoiceCreateSchema);
registry.register('InvoiceListResponse', invoiceListResponseSchema);
registry.register('InvoicePdfRequest', invoicePdfRequestSchema);
registry.register('Payment', paymentSchema);
registry.register('PaymentCreate', paymentCreateSchema);
registry.register('PaymentListResponse', paymentListResponseSchema);
registry.register('DuesReport', duesReportSchema);
registry.register('SalesReport', salesReportSchema);
registry.register('PaymentsLedger', paymentsLedgerSchema);

registry.registerPath({
  method: 'get',
  path: '/api/v1/health',
  description: 'Health check for the API and dependencies',
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: healthCheckSchema,
          example: healthCheckExample
        }
      }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/customers',
  description: 'List customers with optional search',
  request: {
    query: customerListQuerySchema
  },
  responses: {
    200: {
      description: 'List of customers',
      content: {
        'application/json': {
          schema: customerListResponseSchema,
          example: {
            data: [exampleCustomer],
            pagination: { total: 1, limit: 20, offset: 0 }
          }
        }
      }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/customers',
  description: 'Create a customer',
  request: {
    body: {
      content: {
        'application/json': {
          schema: customerCreateSchema,
          example: exampleCustomerCreate
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Created customer',
      content: {
        'application/json': {
          schema: customerSchema,
          example: exampleCustomer
        }
      }
    },
    400: { description: 'Validation error', content: { 'application/json': { schema: errorSchema } } }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/customers/{id}',
  description: 'Fetch a customer by id',
  request: {
    params: z.object({ id: z.string() })
  },
  responses: {
    200: {
      description: 'Customer found',
      content: { 'application/json': { schema: customerSchema, example: exampleCustomer } }
    },
    404: { description: 'Customer missing', content: { 'application/json': { schema: errorSchema } } }
  }
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/customers/{id}',
  description: 'Update a customer',
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: customerCreateSchema.partial(),
          example: { phone: '+1 555 987 6543' }
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Updated customer',
      content: { 'application/json': { schema: customerSchema, example: exampleCustomer } }
    },
    404: { description: 'Customer missing', content: { 'application/json': { schema: errorSchema } } }
  }
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/customers/{id}',
  description: 'Delete a customer',
  request: {
    params: z.object({ id: z.string() })
  },
  responses: {
    204: { description: 'Deleted' },
    404: { description: 'Customer missing', content: { 'application/json': { schema: errorSchema } } }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/customers/{id}/ledger',
  description: 'Customer ledger summary',
  request: {
    params: z.object({ id: z.string() })
  },
  responses: {
    200: {
      description: 'Ledger summary',
      content: { 'application/json': { schema: customerLedgerSchema, example: exampleCustomerLedger } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/products',
  description: 'List products',
  request: { query: productListQuerySchema },
  responses: {
    200: {
      description: 'List of products',
      content: {
        'application/json': {
          schema: productListResponseSchema,
          example: { data: [exampleProduct], pagination: { total: 1, limit: 20, offset: 0 } }
        }
      }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/products',
  description: 'Create product',
  request: {
    body: {
      content: {
        'application/json': {
          schema: productCreateSchema,
          example: exampleProductCreate
        }
      }
    }
  },
  responses: {
    201: {
      description: 'Created product',
      content: { 'application/json': { schema: productSchema, example: exampleProduct } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/products/{id}',
  description: 'Product details',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'Product info',
      content: { 'application/json': { schema: productSchema, example: exampleProduct } }
    },
    404: { description: 'Product missing', content: { 'application/json': { schema: errorSchema } } }
  }
});

registry.registerPath({
  method: 'put',
  path: '/api/v1/products/{id}',
  description: 'Update product',
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: productCreateSchema.partial(), example: { stockQty: 150 } } } }
  },
  responses: {
    200: {
      description: 'Updated product',
      content: { 'application/json': { schema: productSchema, example: exampleProduct } }
    }
  }
});

registry.registerPath({
  method: 'delete',
  path: '/api/v1/products/{id}',
  description: 'Delete product',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    204: { description: 'Deleted' }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/invoices',
  description: 'Create invoice with items',
  request: {
    body: { content: { 'application/json': { schema: invoiceCreateSchema, example: exampleInvoiceCreate } } }
  },
  responses: {
    201: {
      description: 'Created invoice',
      content: { 'application/json': { schema: invoiceSchema, example: exampleInvoice } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/invoices/{id}',
  description: 'Get invoice by id',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'Invoice',
      content: { 'application/json': { schema: invoiceSchema, example: exampleInvoice } }
    },
    404: { description: 'Invoice missing', content: { 'application/json': { schema: errorSchema } } }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/invoices/{id}/pdf',
  description: 'Render an invoice as a PDF document',
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: invoicePdfRequestSchema,
          example: exampleInvoicePdfRequest
        }
      }
    }
  },
  responses: {
    200: {
      description: 'Invoice PDF ready to download',
      content: {
        'application/pdf': {
          schema: z.string().openapi({ type: 'string', format: 'binary' })
        }
      }
    },
    400: { description: 'Invalid request', content: { 'application/json': { schema: errorSchema } } },
    404: { description: 'Invoice missing', content: { 'application/json': { schema: errorSchema } } }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/invoices',
  description: 'Search invoices',
  request: { query: invoiceListQuerySchema },
  responses: {
    200: {
      description: 'Invoices',
      content: {
        'application/json': {
          schema: invoiceListResponseSchema,
          example: { data: [exampleInvoice], pagination: { total: 1, limit: 20, offset: 0 } }
        }
      }
    }
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/payments',
  description: 'Record a payment',
  request: {
    body: { content: { 'application/json': { schema: paymentCreateSchema, example: examplePaymentCreate } } }
  },
  responses: {
    201: {
      description: 'Payment recorded',
      content: { 'application/json': { schema: paymentSchema, example: examplePayment } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/payments',
  description: 'List payments',
  request: { query: paymentListQuerySchema },
  responses: {
    200: {
      description: 'Payments',
      content: {
        'application/json': {
          schema: paymentListResponseSchema,
          example: { data: [examplePayment], pagination: { total: 1, limit: 20, offset: 0 } }
        }
      }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/payments/{id}',
  description: 'Payment details',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      description: 'Payment',
      content: { 'application/json': { schema: paymentSchema, example: examplePayment } }
    },
    404: { description: 'Payment missing', content: { 'application/json': { schema: errorSchema } } }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/reports/dues',
  description: 'Outstanding balances per customer',
  request: { query: duesReportQuerySchema },
  responses: {
    200: {
      description: 'Dues report',
      content: { 'application/json': { schema: duesReportSchema, example: exampleDuesReport } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/reports/sales',
  description: 'Sales totals over time',
  request: { query: salesReportQuerySchema },
  responses: {
    200: {
      description: 'Sales report',
      content: { 'application/json': { schema: salesReportSchema, example: exampleSalesReport } }
    }
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/reports/payments',
  description: 'Payments ledger with running totals',
  request: { query: paymentsLedgerQuerySchema },
  responses: {
    200: {
      description: 'Payments ledger',
      content: { 'application/json': { schema: paymentsLedgerSchema, example: examplePaymentsLedger } }
    }
  }
});

const generator = new OpenApiGeneratorV31(registry.definitions);

export const createOpenApiDocument = () =>
  generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Stationery API',
      version: '1.0.0',
      description: 'Stationery shop management API built with Express and SQLite'
    }
  });
