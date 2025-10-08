import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { exampleInvoice } from '@stationery/shared';

vi.mock('../templates/invoice/render.js', () => ({
  renderInvoiceHtml: vi.fn(() => '<html><body>Invoice</body></html>')
}));

const { renderInvoiceHtml } = await import('../templates/invoice/render.js');
const { getInvoicePdfRenderer, setInvoicePdfRenderer } = await import('./invoice-pdf.js');

describe('invoice pdf renderer', () => {
  afterEach(() => {
    setInvoicePdfRenderer(null);
    delete process.env.PDF_PREVIEW_DIR;
    delete process.env.MOCK_INVOICE_PDF;
    vi.mocked(renderInvoiceHtml).mockClear();
  });

  it('returns a cached mock renderer in test environments', async () => {
    setInvoicePdfRenderer(null);
    delete process.env.MOCK_INVOICE_PDF;

    const renderer = getInvoicePdfRenderer();
    const again = getInvoicePdfRenderer();
    expect(renderer).toBe(again);

    const pdf = await renderer.render(exampleInvoice, { variant: 'thermal' });
    expect(pdf.toString('utf8')).toContain('%PDF-1.4');
    expect(renderInvoiceHtml).toHaveBeenCalledWith(exampleInvoice, { variant: 'thermal' });
  });

  it('writes previews to the configured directory', async () => {
    const previewRoot = await mkdtemp(path.join(tmpdir(), 'invoice-preview-'));
    process.env.PDF_PREVIEW_DIR = previewRoot;
    setInvoicePdfRenderer(null);

    const renderer = getInvoicePdfRenderer();
    const previewPath = await renderer.preview(exampleInvoice, {});
    expect(path.dirname(previewPath)).toBe(previewRoot);

    const contents = await readFile(previewPath);
    expect(contents.length).toBeGreaterThan(0);

    await rm(previewPath, { force: true });
    await rm(previewRoot, { recursive: true, force: true });
  });
});
