import { exampleDuesReport } from '@stationery/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

const closeMock = vi.fn();
const pageCloseMock = vi.fn();

vi.mock('../templates/reports/render.js', () => ({
  renderDuesReportHtml: vi.fn(() => '<html>Dues</html>'),
  renderSalesReportHtml: vi.fn(() => '<html>Sales</html>'),
  renderPaymentsLedgerHtml: vi.fn(() => '<html>Ledger</html>'),
}));

vi.mock('puppeteer', () => {
  const page = {
    setContent: vi.fn(async () => {}),
    emulateMediaType: vi.fn(async () => {}),
    pdf: vi.fn(async () => Buffer.from('%PDF-report')),
    close: pageCloseMock,
  };
  const browser = {
    newPage: vi.fn(async () => page),
    close: closeMock,
  };
  const launcher = vi.fn(async () => browser);
  return {
    default: { launch: launcher },
    launch: launcher,
  };
});

describe('puppeteer report renderer', () => {
  afterEach(async () => {
    const { setReportPdfRenderer } = await import('./report-pdf.js');
    setReportPdfRenderer(null);
    vi.resetModules();
    delete process.env.MOCK_REPORT_PDF;
    delete process.env.NODE_ENV;
    delete process.env.PUPPETEER_HEADLESS;
    vi.clearAllMocks();
  });

  it('uses puppeteer when mock mode is disabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MOCK_REPORT_PDF = 'false';
    const { renderDuesReportPdf } = await import('./report-pdf.js');
    const buffer = await renderDuesReportPdf(exampleDuesReport);
    expect(buffer.toString('utf8')).toContain('%PDF-report');
    expect(pageCloseMock).toHaveBeenCalled();
    expect(closeMock).not.toHaveBeenCalled();
  });

  it('maps headless overrides when launching puppeteer', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MOCK_REPORT_PDF = 'false';
    process.env.PUPPETEER_HEADLESS = '0';

    const { renderDuesReportPdf } = await import('./report-pdf.js');
    await renderDuesReportPdf(exampleDuesReport);
    const { launch } = await import('puppeteer');
    expect(vi.mocked(launch).mock.calls.at(-1)?.[0]).toMatchObject({ headless: false });

    const { setReportPdfRenderer } = await import('./report-pdf.js');
    setReportPdfRenderer(null);
    process.env.PUPPETEER_HEADLESS = 'shell';
    await renderDuesReportPdf(exampleDuesReport);
    expect(vi.mocked(launch).mock.calls.at(-1)?.[0]).toMatchObject({ headless: 'shell' });
  });
});
