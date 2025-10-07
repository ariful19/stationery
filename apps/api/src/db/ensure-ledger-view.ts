import { sqlite } from './client.js';

const viewSql = `
DROP VIEW IF EXISTS customer_ledger;
CREATE VIEW customer_ledger AS
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
  COALESCE(invoice_totals.total_invoiced_cents, 0) -
  COALESCE(payment_totals.total_paid_cents, 0) AS balance_cents
FROM customers c
LEFT JOIN invoice_totals ON invoice_totals.customer_id = c.id
LEFT JOIN payment_totals ON payment_totals.customer_id = c.id;
`;

sqlite.exec(viewSql);
console.log('Customer ledger view ensured.');
sqlite.close();
