import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  exampleDuesReport,
  examplePaymentsLedger,
  exampleSalesReport
} from '@stationery/shared';

vi.mock('../templates/reports/render.js', () => ({
  renderDuesReportHtml: vi.fn(() => '<html><body>Dues</body></html>'),
  renderSalesReportHtml: vi.fn(() => '<html><body>Sales</body></html>'),
  renderPaymentsLedgerHtml: vi.fn(() => '<html><body>Ledger</body></html>')
}));

const {
  renderDuesReportHtml,
  renderPaymentsLedgerHtml,
  renderSalesReportHtml
} = await import('../templates/reports/render.js');
const {
  renderDuesReportPdf,
  renderPaymentsLedgerPdf,
  renderSalesReportPdf,
  setReportPdfRenderer
} = await import('./report-pdf.js');

describe('report pdf renderer', () => {
  afterEach(() => {
    setReportPdfRenderer(null);
    vi.mocked(renderDuesReportHtml).mockClear();
    vi.mocked(renderSalesReportHtml).mockClear();
    vi.mocked(renderPaymentsLedgerHtml).mockClear();
  });

  it('encodes report html into deterministic mock pdf buffers', async () => {
    const duesBuffer = await renderDuesReportPdf(exampleDuesReport);
    expect(duesBuffer.toString('utf8')).toContain('%PDF-1.4');
    expect(renderDuesReportHtml).toHaveBeenCalledWith(exampleDuesReport);

    const salesBuffer = await renderSalesReportPdf(exampleSalesReport);
    expect(salesBuffer.toString('utf8')).toContain('%PDF-1.4');
    expect(renderSalesReportHtml).toHaveBeenCalledWith(exampleSalesReport);

    const ledgerBuffer = await renderPaymentsLedgerPdf(examplePaymentsLedger);
    expect(ledgerBuffer.toString('utf8')).toContain('%PDF-1.4');
    expect(renderPaymentsLedgerHtml).toHaveBeenCalledWith(examplePaymentsLedger);
  });

  it('allows overriding the renderer implementation', async () => {
    const htmlPayloads: string[] = [];
    setReportPdfRenderer({
      async render(html: string) {
        htmlPayloads.push(html);
        return Buffer.from('custom');
      },
      async close() {}
    });

    const buffer = await renderSalesReportPdf(exampleSalesReport);
    expect(buffer.toString('utf8')).toBe('custom');
    expect(htmlPayloads[0]).toContain('Sales');
  });
});
