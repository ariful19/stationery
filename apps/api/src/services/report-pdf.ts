import puppeteer, { Browser, LaunchOptions } from 'puppeteer';
import {
  type DuesReport,
  type PaymentsLedger,
  type SalesReport
} from '@stationery/shared';
import {
  renderDuesReportHtml,
  renderPaymentsLedgerHtml,
  renderSalesReportHtml
} from '../templates/reports/render.js';

interface ReportPdfRenderer {
  render(html: string): Promise<Buffer>;
  close(): Promise<void>;
}

class PuppeteerReportPdfRenderer implements ReportPdfRenderer {
  private browserPromise: Promise<Browser> | null = null;

  constructor(private readonly launchOptions: LaunchOptions = {}) {}

  private async getBrowser() {
    if (!this.browserPromise) {
      const headless = (process.env.PUPPETEER_HEADLESS as LaunchOptions['headless']) ?? 'new';
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

      this.browserPromise = puppeteer
        .launch({
          headless,
          executablePath: executablePath && executablePath.length > 0 ? executablePath : undefined,
          args: ['--no-sandbox', '--font-render-hinting=medium', '--disable-dev-shm-usage'],
          ...this.launchOptions
        })
        .catch(error => {
          this.browserPromise = null;
          throw error;
        });
    }

    return this.browserPromise;
  }

  async render(html: string) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.emulateMediaType('print');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '18mm', bottom: '20mm', left: '18mm', right: '18mm' }
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
      this.browserPromise = null;
    }
  }
}

class MockReportPdfRenderer implements ReportPdfRenderer {
  async render(html: string) {
    const payload = `%PDF-1.4\n%mock\n${Buffer.from(html).toString('base64')}`;
    return Buffer.from(payload);
  }

  async close() {
    return Promise.resolve();
  }
}

let activeRenderer: ReportPdfRenderer | null = null;

function getRenderer(): ReportPdfRenderer {
  if (activeRenderer) return activeRenderer;
  if (process.env.MOCK_REPORT_PDF === 'true' || process.env.NODE_ENV === 'test') {
    activeRenderer = new MockReportPdfRenderer();
  } else {
    activeRenderer = new PuppeteerReportPdfRenderer();
  }
  return activeRenderer;
}

export function setReportPdfRenderer(renderer: ReportPdfRenderer | null) {
  activeRenderer = renderer;
}

export async function renderDuesReportPdf(report: DuesReport) {
  return getRenderer().render(renderDuesReportHtml(report));
}

export async function renderSalesReportPdf(report: SalesReport) {
  return getRenderer().render(renderSalesReportHtml(report));
}

export async function renderPaymentsLedgerPdf(ledger: PaymentsLedger) {
  return getRenderer().render(renderPaymentsLedgerHtml(ledger));
}

process.once('exit', async () => {
  if (activeRenderer) {
    await activeRenderer.close().catch(() => {});
  }
});
