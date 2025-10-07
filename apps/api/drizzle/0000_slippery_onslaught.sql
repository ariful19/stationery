CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`note` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`description` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`line_total_cents` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_no` text NOT NULL,
	`customer_id` integer NOT NULL,
	`issue_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`sub_total_cents` integer DEFAULT 0 NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`tax_cents` integer DEFAULT 0 NOT NULL,
	`grand_total_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`notes` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`invoice_id` integer,
	`amount_cents` integer NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`paid_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`note` text,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`unit_price_cents` integer NOT NULL,
	`stock_qty` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE INDEX `customers_phone_idx` ON `customers` (`phone`);--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_idx` ON `invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `invoice_items_product_idx` ON `invoice_items` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_no_unique` ON `invoices` (`invoice_no`);--> statement-breakpoint
CREATE INDEX `invoices_customer_idx` ON `invoices` (`customer_id`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `payments_customer_idx` ON `payments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `payments_invoice_idx` ON `payments` (`invoice_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE VIEW `customer_ledger` AS
WITH invoice_totals AS (
        SELECT
                customer_id,
                SUM(grand_total_cents) AS total_invoiced_cents
        FROM invoices
        WHERE status IN ('issued', 'partial')
        GROUP BY customer_id
),
payment_totals AS (
        SELECT
                customer_id,
                SUM(amount_cents) AS total_paid_cents
        FROM payments
        GROUP BY customer_id
)
SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        COALESCE(invoice_totals.total_invoiced_cents, 0) AS invoiced_cents,
        COALESCE(payment_totals.total_paid_cents, 0) AS paid_cents,
        COALESCE(invoice_totals.total_invoiced_cents, 0) - COALESCE(payment_totals.total_paid_cents, 0) AS balance_cents
FROM customers c
LEFT JOIN invoice_totals ON invoice_totals.customer_id = c.id
LEFT JOIN payment_totals ON payment_totals.customer_id = c.id;--> statement-breakpoint