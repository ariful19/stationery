import { exampleInvoice } from '@stationery/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

const closeMock = vi.fn();
const pageCloseMock = vi.fn();

vi.mock('../templates/invoice/render.js', () => ({
  renderInvoiceHtml: vi.fn(() => '<html><body>Puppeteer</body></html>'),
}));

vi.mock('puppeteer', () => {
  const page = {
    setContent: vi.fn(async () => {}),
    emulateMediaType: vi.fn(async () => {}),
    pdf: vi.fn(async () => Buffer.from('%PDF-1.4 test')),
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

describe('puppeteer invoice renderer', () => {
  afterEach(async () => {
    const { setInvoicePdfRenderer } = await import('./invoice-pdf.js');
    setInvoicePdfRenderer(null);
    vi.resetModules();
    delete process.env.MOCK_INVOICE_PDF;
    delete process.env.NODE_ENV;
    delete process.env.PUPPETEER_HEADLESS;
    vi.clearAllMocks();
  });

  it('invokes puppeteer when mock mode is disabled', async () => {
    process.env.NODE_ENV = 'development';
    process.env.MOCK_INVOICE_PDF = 'false';
    const { getInvoicePdfRenderer } = await import('./invoice-pdf.js');
    const renderer = getInvoicePdfRenderer();
    const pdf = await renderer.render(exampleInvoice, {});
    expect(pdf.toString('utf8')).toContain('%PDF-1.4');
    await renderer.close();
    expect(closeMock).toHaveBeenCalled();
    expect(pageCloseMock).toHaveBeenCalled();
  });

  it('passes through explicit headless overrides', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MOCK_INVOICE_PDF = 'false';
    process.env.PUPPETEER_HEADLESS = 'false';

    const { getInvoicePdfRenderer } = await import('./invoice-pdf.js');
    const renderer = getInvoicePdfRenderer();
    await renderer.render(exampleInvoice, {});
    const { launch } = await import('puppeteer');
    expect(vi.mocked(launch).mock.calls.at(-1)?.[0]).toMatchObject({ headless: false });

    await renderer.close();

    process.env.PUPPETEER_HEADLESS = 'shell';
    const { setInvoicePdfRenderer, getInvoicePdfRenderer: freshRendererFactory } = await import(
      './invoice-pdf.js'
    );
    setInvoicePdfRenderer(null);
    const nextRenderer = freshRendererFactory();
    await nextRenderer.render(exampleInvoice, {});
    expect(vi.mocked(launch).mock.calls.at(-1)?.[0]).toMatchObject({ headless: 'shell' });
    await nextRenderer.close();
  });
});
