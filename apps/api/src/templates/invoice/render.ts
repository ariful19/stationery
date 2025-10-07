import type { Invoice } from '@stationery/shared';
import { getInvoiceFontFaceCss } from './fonts.js';

export type InvoiceTemplateVariant = 'a4' | 'thermal';
export type WritingDirection = 'ltr' | 'rtl';

export interface InvoiceBranding {
  companyName?: string;
  companyAddress?: string[];
  companyContact?: string[];
  accentColor?: string;
  logoDataUrl?: string;
  watermarkDataUrl?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  footerLines?: string[];
}

export interface InvoiceTemplateOptions {
  variant?: InvoiceTemplateVariant;
  locale?: string;
  currency?: string;
  timezone?: string;
  direction?: WritingDirection;
  brand?: InvoiceBranding;
}

const ACCENT_FALLBACK = '#2f5d62';

const URL_WHITELIST = /^(data:image\/(png|jpeg|jpg|gif|webp);base64,|https?:)/i;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url: string | undefined) {
  if (!url) return undefined;
  return URL_WHITELIST.test(url) ? url : undefined;
}

function renderList(lines?: string[]) {
  if (!lines || lines.length === 0) return '';
  return lines.map(line => `<div>${escapeHtml(line)}</div>`).join('');
}

export function renderInvoiceHtml(invoice: Invoice, options: InvoiceTemplateOptions = {}) {
  const {
    variant = 'a4',
    locale = 'en-US',
    currency = 'USD',
    timezone,
    direction = 'ltr',
    brand
  } = options;

  const accentColor = brand?.accentColor ?? ACCENT_FALLBACK;
  const footerLines = brand?.footerLines ?? [];
  const logoDataUrl = sanitizeUrl(brand?.logoDataUrl);
  const watermarkDataUrl = sanitizeUrl(brand?.watermarkDataUrl);
  const watermarkText = brand?.watermarkText?.trim();
  const watermarkOpacity = brand?.watermarkOpacity ?? 0.06;

  const moneyFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: timezone || 'UTC'
  });

  const renderMoney = (value: number) => moneyFormatter.format(value / 100);
  const renderDate = (value: string) => {
    try {
      return dateFormatter.format(new Date(value));
    } catch (error) {
      return value;
    }
  };

  const customerAddress = invoice.customer?.address
    ? [invoice.customer.address, invoice.customer.city, invoice.customer.state, invoice.customer.postalCode]
        .filter(Boolean)
        .map(part => part!.trim())
    : [];

  const customerContact = [invoice.customer?.email, invoice.customer?.phone].filter(Boolean) as string[];

  const pageClass = variant === 'thermal' ? 'thermal-layout' : 'a4-layout';

  const itemsRows = invoice.items
    .map((item, index) => {
      const productCode = `SKU #${escapeHtml(item.productId.toString())}`;
      const label = item.description ? escapeHtml(item.description) : `Item ${index + 1}`;
      return `<tr>
        <td class="description">
          <div class="name">${label}</div>
          <div class="product">${productCode}</div>
        </td>
        <td class="qty">${item.quantity}</td>
        <td class="price">${renderMoney(item.unitPriceCents)}</td>
        <td class="total">${renderMoney(item.lineTotalCents)}</td>
      </tr>`;
    })
    .join('');

  const paymentRows = invoice.payments
    .map(payment => `<div class="payment-row">
        <div>${escapeHtml(renderDate(payment.paidAt))}</div>
        <div>${renderMoney(payment.amountCents)}</div>
        ${payment.note ? `<div class="payment-note">${escapeHtml(payment.note)}</div>` : ''}
      </div>`)
    .join('');

  const notesBlock = invoice.notes ? `<div class="notes"><h3>Notes</h3><p>${escapeHtml(invoice.notes)}</p></div>` : '';

  const fontFaceCss = getInvoiceFontFaceCss();

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}" dir="${direction === 'rtl' ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      ${fontFaceCss}

      :root {
        color-scheme: light;
        font-family: 'Inter', 'Segoe UI', Roboto, system-ui, -apple-system, sans-serif;
        --accent: ${accentColor};
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #f3f4f6;
        color: #111827;
        font-size: 14px;
        line-height: 1.45;
      }

      body {
        padding: 24px;
      }

      .invoice-wrapper {
        max-width: 900px;
        margin: 0 auto;
        background: #fff;
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(15, 23, 42, 0.12);
        position: relative;
      }

      .invoice-wrapper.${pageClass} {
        padding: 32px;
      }

      .invoice-wrapper.thermal-layout {
        max-width: 86mm;
        padding: 20px;
        border-radius: 12px;
        box-shadow: none;
      }

      .watermark {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        opacity: ${watermarkDataUrl || watermarkText ? watermarkOpacity : 0};
      }

      .watermark img {
        max-width: 60%;
        height: auto;
      }

      .watermark span {
        font-size: 64px;
        font-weight: 600;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.5rem;
        opacity: 0.25;
      }

      header.invoice-header {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 24px;
        border-bottom: 3px solid rgba(17, 24, 39, 0.08);
        padding-bottom: 24px;
        position: relative;
      }

      .brand-block {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 200px;
      }

      .logo {
        width: 160px;
        max-width: 200px;
      }

      .logo img {
        width: 100%;
        height: auto;
        object-fit: contain;
      }

      .logo-placeholder {
        padding: 16px;
        border: 1px dashed rgba(17, 24, 39, 0.2);
        border-radius: 12px;
        color: rgba(17, 24, 39, 0.5);
        text-align: center;
        font-weight: 600;
      }

      .company-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 13px;
        color: #4b5563;
      }

      .invoice-meta {
        text-align: end;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 220px;
      }

      .invoice-meta h1 {
        margin: 0;
        font-size: 28px;
        letter-spacing: 0.08em;
        color: var(--accent);
      }

      .meta-row {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .meta-row span.label {
        font-weight: 600;
        min-width: 90px;
        color: rgba(17, 24, 39, 0.6);
      }

      [dir='rtl'] .invoice-meta {
        text-align: start;
        align-items: flex-start;
      }

      [dir='rtl'] .meta-row {
        flex-direction: row-reverse;
        justify-content: flex-start;
      }

      [dir='rtl'] .meta-row span.label {
        text-align: start;
      }

      .section {
        margin-top: 28px;
      }

      .addresses {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 24px;
      }

      .card {
        background: rgba(249, 250, 251, 0.9);
        border-radius: 16px;
        padding: 20px;
        border: 1px solid rgba(17, 24, 39, 0.05);
      }

      .card h3 {
        margin: 0 0 12px;
        font-size: 15px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(17, 24, 39, 0.7);
      }

      table.invoice-items {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
      }

      table.invoice-items thead th {
        text-align: left;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(17, 24, 39, 0.6);
        padding: 12px 16px;
        background: rgba(15, 23, 42, 0.04);
      }

      table.invoice-items tbody td {
        padding: 16px;
        border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        vertical-align: top;
      }

      table.invoice-items tbody tr:last-child td {
        border-bottom: none;
      }

      table.invoice-items td.qty,
      table.invoice-items td.price,
      table.invoice-items td.total {
        text-align: end;
        white-space: nowrap;
      }

      table.invoice-items td.description .name {
        font-weight: 600;
        margin-bottom: 6px;
        color: rgba(17, 24, 39, 0.75);
      }

      table.invoice-items td.description .product {
        font-size: 12px;
        color: rgba(17, 24, 39, 0.6);
      }

      table.invoice-items td.description .note {
        font-size: 12px;
        margin-top: 8px;
        color: rgba(55, 65, 81, 0.85);
      }

      .summary {
        margin-top: 24px;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 24px;
      }

      .totals {
        min-width: 240px;
        display: grid;
        gap: 10px;
        font-size: 14px;
      }

      .totals-row {
        display: flex;
        justify-content: space-between;
      }

      .totals-row.grand {
        font-size: 18px;
        font-weight: 600;
        color: var(--accent);
        border-top: 2px solid rgba(17, 24, 39, 0.1);
        padding-top: 12px;
      }

      .payments {
        display: grid;
        gap: 12px;
      }

      .payment-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: baseline;
        padding: 12px 16px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-radius: 12px;
        background: rgba(249, 250, 251, 0.8);
      }

      .payment-row > div:nth-child(2) {
        font-weight: 600;
      }

      .payment-note {
        grid-column: 1 / -1;
        font-size: 12px;
        color: rgba(55, 65, 81, 0.9);
      }

      .notes {
        margin-top: 24px;
        padding: 20px;
        border-radius: 16px;
        border: 1px dashed rgba(17, 24, 39, 0.15);
        background: rgba(250, 250, 250, 0.9);
      }

      footer.invoice-footer {
        margin-top: 36px;
        padding-top: 18px;
        border-top: 1px solid rgba(15, 23, 42, 0.1);
        font-size: 12px;
        color: rgba(75, 85, 99, 0.9);
        display: grid;
        gap: 4px;
        text-align: center;
      }

      @media (max-width: 720px) {
        body {
          padding: 12px;
        }

        .invoice-wrapper.${pageClass} {
          padding: 20px;
          border-radius: 12px;
        }

        header.invoice-header {
          flex-direction: column;
          text-align: left;
          align-items: stretch;
        }

        .invoice-meta {
          text-align: left;
        }

        table.invoice-items thead {
          display: none;
        }

        table.invoice-items tbody td {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          padding: 12px 8px;
        }

        table.invoice-items tbody td.description {
          grid-template-columns: 1fr;
        }

        table.invoice-items tbody td.qty::before {
          content: 'Qty';
          font-weight: 600;
          color: rgba(17, 24, 39, 0.6);
        }

        table.invoice-items tbody td.price::before {
          content: 'Price';
          font-weight: 600;
          color: rgba(17, 24, 39, 0.6);
        }

        table.invoice-items tbody td.total::before {
          content: 'Total';
          font-weight: 600;
          color: rgba(17, 24, 39, 0.6);
        }
      }

      @media print {
        html, body {
          background: #fff;
        }

        body {
          padding: 0;
        }

        .invoice-wrapper {
          box-shadow: none;
          border-radius: 0;
        }

        .invoice-wrapper.${pageClass} {
          padding: ${variant === 'thermal' ? '8mm' : '18mm'};
        }

        .watermark {
          opacity: ${watermarkDataUrl || watermarkText ? watermarkOpacity : 0};
        }
      }

      @page {
        size: ${variant === 'thermal' ? '80mm auto' : 'A4'};
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div class="invoice-wrapper ${pageClass}">
      <div class="watermark">
        ${
          watermarkDataUrl
            ? `<img src="${watermarkDataUrl}" alt="Watermark" />`
            : watermarkText
              ? `<span>${escapeHtml(watermarkText)}</span>`
              : ''
        }
      </div>
      <header class="invoice-header">
        <div class="brand-block">
          <div class="logo">
            ${
              logoDataUrl
                ? `<img src="${logoDataUrl}" alt="${escapeHtml(brand?.companyName ?? 'Company logo')}" />`
                : '<div class="logo-placeholder">Your Logo</div>'
            }
          </div>
          <div class="company-details">
            ${brand?.companyName ? `<strong>${escapeHtml(brand.companyName)}</strong>` : ''}
            ${renderList(brand?.companyAddress)}
            ${renderList(brand?.companyContact)}
          </div>
        </div>
        <div class="invoice-meta">
          <h1>Invoice</h1>
          <div class="meta-row"><span class="label">Number</span><span>${escapeHtml(invoice.invoiceNo)}</span></div>
          <div class="meta-row"><span class="label">Issue Date</span><span>${renderDate(invoice.issueDate)}</span></div>
          <div class="meta-row"><span class="label">Status</span><span>${escapeHtml(invoice.status)}</span></div>
        </div>
      </header>

      <section class="section addresses">
        <div class="card">
          <h3>Bill To</h3>
          ${invoice.customer?.name ? `<div><strong>${escapeHtml(invoice.customer.name)}</strong></div>` : ''}
          ${renderList(customerAddress)}
          ${renderList(customerContact)}
        </div>
        <div class="card">
          <h3>Summary</h3>
          <div>Subtotal: <strong>${renderMoney(invoice.subTotalCents)}</strong></div>
          <div>Discount: <strong>${renderMoney(invoice.discountCents)}</strong></div>
          <div>Tax: <strong>${renderMoney(invoice.taxCents)}</strong></div>
          <div>Total Due: <strong>${renderMoney(invoice.grandTotalCents)}</strong></div>
        </div>
      </section>

      <section class="section">
        <table class="invoice-items">
          <thead>
            <tr>
              <th scope="col">Description</th>
              <th scope="col">Qty</th>
              <th scope="col">Price</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </section>

      <section class="section summary">
        <div class="totals">
          <div class="totals-row"><span>Subtotal</span><span>${renderMoney(invoice.subTotalCents)}</span></div>
          <div class="totals-row"><span>Discounts</span><span>${renderMoney(invoice.discountCents)}</span></div>
          <div class="totals-row"><span>Tax</span><span>${renderMoney(invoice.taxCents)}</span></div>
          <div class="totals-row grand"><span>Grand Total</span><span>${renderMoney(invoice.grandTotalCents)}</span></div>
        </div>
        ${
          invoice.payments.length
            ? `<div class="payments">
                <h3>Payments</h3>
                ${paymentRows}
              </div>`
            : ''
        }
      </section>

      ${notesBlock}

      ${
        footerLines.length
          ? `<footer class="invoice-footer">${footerLines.map(line => `<div>${escapeHtml(line)}</div>`).join('')}</footer>`
          : ''
      }
    </div>
  </body>
</html>`;
}
