import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  sqliteView,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const customers = sqliteTable(
  'customers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    emailUnique: uniqueIndex('customers_email_unique').on(table.email),
    phoneIdx: index('customers_phone_idx').on(table.phone),
  }),
);

export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    unitPriceCents: integer('unit_price_cents').notNull(),
    stockQty: integer('stock_qty').notNull().default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    skuUnique: uniqueIndex('products_sku_unique').on(table.sku),
    nameIdx: index('products_name_idx').on(table.name),
  }),
);

export const invoices = sqliteTable(
  'invoices',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    invoiceNo: text('invoice_no').notNull(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    issueDate: text('issue_date')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    subTotalCents: integer('sub_total_cents').notNull().default(0),
    discountCents: integer('discount_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull().default(0),
    grandTotalCents: integer('grand_total_cents').notNull().default(0),
    status: text('status', {
      enum: ['draft', 'issued', 'partial', 'paid', 'void'],
    })
      .notNull()
      .default('draft'),
    notes: text('notes'),
  },
  (table) => ({
    invoiceNoUnique: uniqueIndex('invoices_invoice_no_unique').on(table.invoiceNo),
    customerIdx: index('invoices_customer_idx').on(table.customerId),
    statusIdx: index('invoices_status_idx').on(table.status),
  }),
);

export const invoiceItems = sqliteTable(
  'invoice_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    invoiceId: integer('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    description: text('description'),
    quantity: integer('quantity').notNull().default(1),
    unitPriceCents: integer('unit_price_cents').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
  },
  (table) => ({
    invoiceIdx: index('invoice_items_invoice_idx').on(table.invoiceId),
    productIdx: index('invoice_items_product_idx').on(table.productId),
  }),
);

export const payments = sqliteTable(
  'payments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    invoiceId: integer('invoice_id').references(() => invoices.id, {
      onDelete: 'set null',
    }),
    amountCents: integer('amount_cents').notNull(),
    method: text('method').notNull().default('cash'),
    paidAt: text('paid_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    note: text('note'),
  },
  (table) => ({
    customerIdx: index('payments_customer_idx').on(table.customerId),
    invoiceIdx: index('payments_invoice_idx').on(table.invoiceId),
  }),
);

export const healthChecks = sqliteTable('health_checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  note: text('note').notNull(),
});

export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
  payments: many(payments),
}));

export const productsRelations = relations(products, ({ many }) => ({
  items: many(invoiceItems),
}));

export const invoicesRelations = relations(invoices, ({ many, one }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.productId],
    references: [products.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const customerLedgerView = sqliteView('customer_ledger', {
  customerId: integer('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  invoicedCents: integer('invoiced_cents').notNull(),
  paidCents: integer('paid_cents').notNull(),
  balanceCents: integer('balance_cents').notNull(),
}).existing();
