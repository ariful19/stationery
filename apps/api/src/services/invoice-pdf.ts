import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Invoice } from '@stationery/shared';
import puppeteer, { Browser, PuppeteerLaunchOptions } from 'puppeteer';

import {
  type InvoiceTemplateOptions,
  type InvoiceTemplateVariant,
  renderInvoiceHtml,
} from '../templates/invoice/render.js';

export interface InvoicePdfRenderOptions extends InvoiceTemplateOptions {
  variant?: InvoiceTemplateVariant;
}

export interface InvoicePdfRenderer {
  render(invoice: Invoice, options?: InvoicePdfRenderOptions): Promise<Buffer>;
  renderToFile(
    invoice: Invoice,
    filePath: string,
    options?: InvoicePdfRenderOptions,
  ): Promise<string>;
  preview(invoice: Invoice, options?: InvoicePdfRenderOptions): Promise<string>;
  close(): Promise<void>;
}

const DEFAULT_PREVIEW_DIR = path.join(process.cwd(), 'tmp', 'previews');

class PuppeteerInvoicePdfRenderer implements InvoicePdfRenderer {
  private browserPromise: Promise<Browser> | null = null;

  constructor(private readonly launchOptions: PuppeteerLaunchOptions = {}) {}

  private async getBrowser() {
    if (!this.browserPromise) {
      const headlessEnv = process.env.PUPPETEER_HEADLESS?.toLowerCase();
      const headless: PuppeteerLaunchOptions['headless'] | undefined =
        headlessEnv === 'true' || headlessEnv === '1' || headlessEnv === 'new'
          ? true
          : headlessEnv === 'false' || headlessEnv === '0'
            ? false
            : headlessEnv === 'shell'
              ? 'shell'
              : undefined;
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

      this.browserPromise = puppeteer
        .launch({
          ...this.launchOptions,
          headless: headless ?? this.launchOptions.headless ?? true,
          executablePath:
            executablePath && executablePath.length > 0
              ? executablePath
              : this.launchOptions.executablePath,
          args: [
            '--no-sandbox',
            '--font-render-hinting=medium',
            '--disable-dev-shm-usage',
            ...(this.launchOptions.args ?? []),
          ],
        })
        .catch((error) => {
          this.browserPromise = null;
          throw error;
        });
    }

    return this.browserPromise;
  }

  async render(invoice: Invoice, options: InvoicePdfRenderOptions = {}) {
    const html = renderInvoiceHtml(invoice, options);
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.emulateMediaType('print');

      const isThermal = options.variant === 'thermal';
      const pdfBuffer = await page.pdf(
        isThermal
          ? {
              printBackground: true,
              preferCSSPageSize: true,
              margin: { top: '6mm', bottom: '8mm', left: '6mm', right: '6mm' },
            }
          : {
              format: 'A4',
              printBackground: true,
              preferCSSPageSize: true,
              margin: { top: '18mm', bottom: '20mm', left: '18mm', right: '18mm' },
            },
      );

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  async renderToFile(invoice: Invoice, filePath: string, options: InvoicePdfRenderOptions = {}) {
    const buffer = await this.render(invoice, options);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return filePath;
  }

  async preview(invoice: Invoice, options: InvoicePdfRenderOptions = {}) {
    const previewRoot = process.env.PDF_PREVIEW_DIR ?? DEFAULT_PREVIEW_DIR;
    const safeNumber = invoice.invoiceNo.replace(/[^\w-]+/g, '_');
    const fileName = `${safeNumber || 'invoice'}-${Date.now()}.pdf`;
    const previewPath = path.join(previewRoot, fileName);
    await this.renderToFile(invoice, previewPath, options);
    return previewPath;
  }

  async close() {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
      this.browserPromise = null;
    }
  }
}

class MockInvoicePdfRenderer implements InvoicePdfRenderer {
  async render(invoice: Invoice, options: InvoicePdfRenderOptions = {}) {
    const html = renderInvoiceHtml(invoice, options);
    const payload = `%PDF-1.4\n%mock\n${Buffer.from(html).toString('base64')}`;
    return Buffer.from(payload);
  }

  async renderToFile(invoice: Invoice, filePath: string, options: InvoicePdfRenderOptions = {}) {
    const buffer = await this.render(invoice, options);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return filePath;
  }

  async preview(invoice: Invoice, options: InvoicePdfRenderOptions = {}) {
    const previewRoot = process.env.PDF_PREVIEW_DIR ?? DEFAULT_PREVIEW_DIR;
    const safeNumber = invoice.invoiceNo.replace(/[^\w-]+/g, '_');
    const fileName = `${safeNumber || 'invoice'}-${Date.now()}.pdf`;
    const previewPath = path.join(previewRoot, fileName);
    return this.renderToFile(invoice, previewPath, options);
  }

  async close() {
    return Promise.resolve();
  }
}

let activeRenderer: InvoicePdfRenderer | null = null;

export function getInvoicePdfRenderer() {
  if (activeRenderer) return activeRenderer;
  if (process.env.MOCK_INVOICE_PDF === 'true' || process.env.NODE_ENV === 'test') {
    activeRenderer = new MockInvoicePdfRenderer();
  } else {
    activeRenderer = new PuppeteerInvoicePdfRenderer();
  }
  return activeRenderer;
}

export function setInvoicePdfRenderer(renderer: InvoicePdfRenderer | null) {
  activeRenderer = renderer;
}

process.once('exit', async () => {
  if (activeRenderer) {
    await activeRenderer.close().catch(() => {});
  }
});
