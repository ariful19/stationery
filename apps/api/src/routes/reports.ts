import { Router } from 'express';
import {
  getDuesReport,
  getPaymentsLedger,
  getSalesReport
} from '../services/report-data.js';
import {
  renderDuesReportPdf,
  renderPaymentsLedgerPdf,
  renderSalesReportPdf
} from '../services/report-pdf.js';
import { asyncHandler } from '../utils/async-handler.js';
import { streamCsv } from '../utils/csv.js';
import { sendPdfBuffer } from '../utils/pdf.js';

const router = Router();

router.get(
  '/dues',
  asyncHandler((req, res) => {
    const report = getDuesReport(req.query);
    res.json(report);
  })
);

router.get(
  '/dues.csv',
  asyncHandler((req, res) => {
    const report = getDuesReport(req.query);
    streamCsv(res, {
      filename: `dues-report-${new Date().toISOString().slice(0, 10)}.csv`,
      header: ['Customer', 'Invoiced', 'Paid', 'Balance'],
      rows: report.customers.map(customer => [
        customer.customerName,
        (customer.invoicedCents / 100).toFixed(2),
        (customer.paidCents / 100).toFixed(2),
        (customer.balanceCents / 100).toFixed(2)
      ])
    });
  })
);

router.get(
  '/dues.pdf',
  asyncHandler(async (req, res) => {
    const report = getDuesReport(req.query);
    const buffer = await renderDuesReportPdf(report);
    sendPdfBuffer(res, buffer, {
      filename: `dues-report-${new Date().toISOString().slice(0, 10)}.pdf`
    });
  })
);

router.get(
  '/sales',
  asyncHandler((req, res) => {
    const report = getSalesReport(req.query);
    res.json(report);
  })
);

router.get(
  '/sales.csv',
  asyncHandler((req, res) => {
    const report = getSalesReport(req.query);
    streamCsv(res, {
      filename: `sales-report-${new Date().toISOString().slice(0, 10)}.csv`,
      header: ['Period', 'Invoices', 'Total'],
      rows: report.rows.map(row => [
        row.period,
        row.invoicesCount,
        (row.totalCents / 100).toFixed(2)
      ])
    });
  })
);

router.get(
  '/sales.pdf',
  asyncHandler(async (req, res) => {
    const report = getSalesReport(req.query);
    const buffer = await renderSalesReportPdf(report);
    sendPdfBuffer(res, buffer, {
      filename: `sales-report-${new Date().toISOString().slice(0, 10)}.pdf`
    });
  })
);

router.get(
  '/payments',
  asyncHandler((req, res) => {
    const ledger = getPaymentsLedger(req.query);
    res.json(ledger);
  })
);

router.get(
  '/payments.csv',
  asyncHandler((req, res) => {
    const ledger = getPaymentsLedger(req.query);
    streamCsv(res, {
      filename: `payments-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      header: ['Paid At', 'Customer', 'Invoice', 'Method', 'Amount', 'Running Total', 'Note'],
      rows: ledger.entries.map(entry => [
        entry.paidAt,
        entry.customerName,
        entry.invoiceNo ?? '',
        entry.method,
        (entry.amountCents / 100).toFixed(2),
        (entry.runningBalanceCents / 100).toFixed(2),
        entry.note ?? ''
      ])
    });
  })
);

router.get(
  '/payments.pdf',
  asyncHandler(async (req, res) => {
    const ledger = getPaymentsLedger(req.query);
    const buffer = await renderPaymentsLedgerPdf(ledger);
    sendPdfBuffer(res, buffer, {
      filename: `payments-ledger-${new Date().toISOString().slice(0, 10)}.pdf`
    });
  })
);

export { router as reportsRouter };
