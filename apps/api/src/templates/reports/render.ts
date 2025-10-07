import {
  type DuesReport,
  type PaymentsLedger,
  type SalesReport
} from '@stationery/shared';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const formatCurrency = (cents: number) => currency.format(cents / 100);

const baseStyles = `
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    padding: 24px;
    color: #1f2933;
  }
  h1 {
    font-size: 24px;
    margin-bottom: 8px;
  }
  h2 {
    font-size: 18px;
    margin: 24px 0 12px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 12px;
  }
  th,
  td {
    border: 1px solid #d0d7de;
    padding: 8px;
    text-align: left;
  }
  th {
    background: #f1f5f9;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
  }
  tfoot td {
    font-weight: 600;
  }
  .meta {
    color: #52606d;
    font-size: 12px;
    margin-bottom: 16px;
  }
  .summary {
    display: flex;
    gap: 24px;
    margin: 16px 0 32px;
  }
  .summary-item {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 12px 16px;
    border-radius: 8px;
    min-width: 160px;
  }
  .summary-item span {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 4px;
  }
  .summary-item strong {
    font-size: 14px;
  }
`;

const htmlShell = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${baseStyles}</style>
  </head>
  <body>
    ${body}
  </body>
</html>`;

export function renderDuesReportHtml(report: DuesReport) {
  const body = `
    <h1>Dues by Customer</h1>
    <p class="meta">Generated ${new Date(report.generatedAt).toLocaleString()}</p>
    <div class="summary">
      <div class="summary-item">
        <span>Customers</span>
        <strong>${report.summary.customersCount}</strong>
      </div>
      <div class="summary-item">
        <span>Total Invoiced</span>
        <strong>${formatCurrency(report.summary.totalInvoicedCents)}</strong>
      </div>
      <div class="summary-item">
        <span>Total Paid</span>
        <strong>${formatCurrency(report.summary.totalPaidCents)}</strong>
      </div>
      <div class="summary-item">
        <span>Outstanding</span>
        <strong>${formatCurrency(report.summary.totalBalanceCents)}</strong>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Invoiced</th>
          <th>Paid</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        ${report.customers
          .map(
            customer => `
              <tr>
                <td>${customer.customerName}</td>
                <td>${formatCurrency(customer.invoicedCents)}</td>
                <td>${formatCurrency(customer.paidCents)}</td>
                <td>${formatCurrency(customer.balanceCents)}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;

  return htmlShell('Dues report', body);
}

export function renderSalesReportHtml(report: SalesReport) {
  const body = `
    <h1>Sales Summary</h1>
    <p class="meta">Generated ${new Date(report.generatedAt).toLocaleString()}</p>
    <div class="summary">
      <div class="summary-item">
        <span>Invoices</span>
        <strong>${report.summary.totalInvoicesCount}</strong>
      </div>
      <div class="summary-item">
        <span>Total Sales</span>
        <strong>${formatCurrency(report.summary.totalCents)}</strong>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Period</th>
          <th>Invoices</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${report.rows
          .map(
            row => `
              <tr>
                <td>${row.period}</td>
                <td>${row.invoicesCount}</td>
                <td>${formatCurrency(row.totalCents)}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;

  return htmlShell('Sales report', body);
}

export function renderPaymentsLedgerHtml(ledger: PaymentsLedger) {
  const body = `
    <h1>Payments Ledger</h1>
    <p class="meta">Generated ${new Date(ledger.generatedAt).toLocaleString()}</p>
    <div class="summary">
      <div class="summary-item">
        <span>Entries</span>
        <strong>${ledger.summary.entriesCount}</strong>
      </div>
      <div class="summary-item">
        <span>Total Received</span>
        <strong>${formatCurrency(ledger.summary.totalPaidCents)}</strong>
      </div>
      <div class="summary-item">
        <span>Period</span>
        <strong>${ledger.summary.firstPaymentAt ? `${new Date(ledger.summary.firstPaymentAt).toLocaleDateString()} - ${new Date(ledger.summary.lastPaymentAt ?? ledger.summary.firstPaymentAt).toLocaleDateString()}` : 'n/a'}</strong>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Paid At</th>
          <th>Customer</th>
          <th>Invoice</th>
          <th>Method</th>
          <th>Amount</th>
          <th>Running Total</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        ${ledger.entries
          .map(
            entry => `
              <tr>
                <td>${new Date(entry.paidAt).toLocaleString()}</td>
                <td>${entry.customerName}</td>
                <td>${entry.invoiceNo ?? ''}</td>
                <td>${entry.method}</td>
                <td>${formatCurrency(entry.amountCents)}</td>
                <td>${formatCurrency(entry.runningBalanceCents)}</td>
                <td>${entry.note ?? ''}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;

  return htmlShell('Payments ledger', body);
}
