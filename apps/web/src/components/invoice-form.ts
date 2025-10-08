import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  calculateInvoiceTotals,
  invoiceStatusSchema,
  type InvoiceCreateInput,
} from '@stationery/shared';
import type { Customer, Product } from '../api/client.js';
import './product-picker.js';
import './money-input.js';
import { animate } from 'motion';
import { formatCurrency } from '../utils/format.js';

interface InvoiceLineDraft {
  id: string;
  productId?: number;
  description?: string;
  quantity: number;
  unitPriceCents: number;
}

const newLine = (): InvoiceLineDraft => ({
  id: Math.random().toString(36).slice(2),
  quantity: 1,
  unitPriceCents: 0,
});

@customElement('invoice-form')
export class InvoiceForm extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    form {
      display: grid;
      gap: var(--space-2xl);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid rgba(215, 222, 234, 0.8);
      box-shadow: var(--shadow-md);
      padding: clamp(1.5rem, 1.2rem + 1.5vw, 2.75rem);
    }

    .form-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-xl);
    }

    .form-header h2 {
      margin: 0;
      font-size: 1.6rem;
      letter-spacing: -0.01em;
    }

    .form-header p {
      margin: 0;
      color: var(--color-text-muted);
      max-width: 460px;
      line-height: 1.6;
    }

    .form-header .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--color-primary);
      font-weight: 600;
    }

    .customer-chip {
      background: var(--color-surface-strong);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      padding: var(--space-lg);
      min-width: 220px;
      display: grid;
      gap: var(--space-xs);
    }

    .customer-chip dt {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-text-muted);
      margin: 0;
    }

    .customer-chip dd {
      margin: 0;
      display: grid;
      gap: 4px;
    }

    .customer-chip strong {
      font-size: 1.1rem;
      letter-spacing: -0.01em;
    }

    .customer-chip span {
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }

    .lines-section,
    .adjustments,
    .summary,
    .notes-field {
      display: grid;
      gap: var(--space-lg);
    }

    .section-header {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
    }

    .section-header h3 {
      margin: 0;
      font-size: 1.15rem;
    }

    .section-header p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: 0.92rem;
    }

    .lines {
      display: grid;
      gap: var(--space-lg);
    }

    .line {
      background: var(--color-surface-strong);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      padding: var(--space-lg);
      display: grid;
      gap: var(--space-lg);
      transition:
        border-color var(--transition-snappy),
        box-shadow var(--transition-snappy),
        transform var(--transition-snappy);
    }

    .line:hover {
      border-color: var(--color-primary);
      box-shadow: 0 18px 36px rgba(37, 99, 235, 0.14);
      transform: translateY(-2px);
    }

    .line header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-md);
    }

    .line-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--color-text-muted);
      font-weight: 600;
    }

    .line-grid {
      display: grid;
      grid-template-columns: minmax(220px, 1.3fr) minmax(110px, 0.6fr) minmax(140px, 0.7fr);
      gap: var(--space-lg);
      align-items: end;
    }

    .line-main {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    label > span,
    .notes-field > span,
    .status-field label span {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text-subtle);
      margin-bottom: var(--space-xs);
    }

    input[type='text'],
    input[type='number'],
    textarea,
    select {
      width: 100%;
      border-radius: var(--radius-md);
      border: 1px solid rgba(215, 222, 234, 0.9);
      background: #fff;
      padding: var(--space-sm) var(--space-md);
      font-size: 0.95rem;
      transition:
        border-color var(--transition-snappy),
        box-shadow var(--transition-snappy);
    }

    input[type='text']:focus-visible,
    input[type='number']:focus-visible,
    textarea:focus-visible,
    select:focus-visible {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
      outline: none;
    }

    input[type='number'] {
      -moz-appearance: textfield;
    }

    input[type='number']::-webkit-outer-spin-button,
    input[type='number']::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    money-input {
      display: block;
    }

    textarea {
      min-height: 96px;
      resize: vertical;
      font-family: inherit;
      line-height: 1.5;
    }

    .helper {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      margin: 0;
    }

    .remove-button {
      border-radius: var(--radius-full, 999px);
      border: 1px solid rgba(215, 222, 234, 0.9);
      background: #fff;
      color: var(--color-text-muted);
      padding: var(--space-xs) var(--space-sm);
      font-size: 0.85rem;
      transition:
        color var(--transition-snappy),
        border-color var(--transition-snappy),
        transform var(--transition-snappy);
    }

    .remove-button:hover:not([disabled]) {
      color: var(--color-negative);
      border-color: rgba(220, 38, 38, 0.3);
      transform: translateY(-1px);
    }

    .remove-button[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .add-line {
      display: inline-flex;
      align-items: center;
      gap: var(--space-sm);
      border-radius: var(--radius-lg);
      border: 1px dashed rgba(37, 99, 235, 0.4);
      background: rgba(37, 99, 235, 0.08);
      color: var(--color-primary);
      padding: var(--space-sm) var(--space-lg);
      font-weight: 600;
      transition:
        background var(--transition-snappy),
        border-color var(--transition-snappy),
        transform var(--transition-snappy);
      width: fit-content;
    }

    .add-line:hover {
      background: rgba(37, 99, 235, 0.12);
      border-color: var(--color-primary);
      transform: translateY(-1px);
    }

    .totals {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-lg);
      background: var(--color-surface-strong);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      padding: var(--space-lg);
    }

    .summary {
      background: linear-gradient(160deg, rgba(37, 99, 235, 0.09), rgba(249, 115, 22, 0.08));
      border-radius: var(--radius-lg);
      border: 1px solid rgba(37, 99, 235, 0.18);
      padding: var(--space-xl);
      box-shadow: var(--shadow-sm);
    }

    .summary h3 {
      margin: 0 0 var(--space-sm) 0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--space-md) var(--space-xl);
      margin: 0;
    }

    .summary-grid dt {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-text-muted);
      margin-bottom: var(--space-xs);
    }

    .summary-grid dd {
      margin: 0;
      font-weight: 600;
      font-size: 1.05rem;
    }

    .summary-grid dd.total {
      font-size: 1.35rem;
      color: var(--color-primary);
      letter-spacing: -0.01em;
    }

    .footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-xl);
      align-items: flex-end;
    }

    .status-field {
      min-width: 220px;
      display: grid;
      gap: var(--space-xs);
    }

    .footer button[type='submit'] {
      border-radius: var(--radius-lg);
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-strong));
      color: #fff;
      border: none;
      padding: var(--space-md) var(--space-2xl);
      font-size: 1rem;
      font-weight: 600;
      box-shadow: 0 16px 32px rgba(37, 99, 235, 0.28);
      transition:
        transform var(--transition-snappy),
        box-shadow var(--transition-snappy);
    }

    .footer button[type='submit']:hover:not([disabled]) {
      transform: translateY(-2px);
      box-shadow: 0 18px 36px rgba(37, 99, 235, 0.32);
    }

    .footer button[type='submit'][disabled] {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }

    @media (max-width: 960px) {
      .line-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .line-grid > *:last-child {
        grid-column: span 2;
      }
    }

    @media (max-width: 720px) {
      form {
        padding: var(--space-xl);
      }

      .line-grid {
        grid-template-columns: 1fr;
      }

      .line-grid > *:last-child {
        grid-column: auto;
      }

      .footer {
        align-items: stretch;
      }

      .footer button[type='submit'] {
        width: 100%;
        justify-content: center;
      }
    }
  `;

  @property({ attribute: false })
  products: Product[] = [];

  @property({ attribute: false })
  customer?: Customer;

  @property({ type: Number })
  discountCents = 0;

  @property({ type: Number })
  taxCents = 0;

  @property({ type: String })
  notes = '';

  @property({ type: String })
  status: InvoiceCreateInput['status'] = 'issued';

  @property({ type: Boolean })
  submitting = false;

  @state()
  private lines: InvoiceLineDraft[] = [newLine()];

  private get totals() {
    const validLines = this.lines.filter((line) => line.productId && line.quantity > 0);
    const calculation = calculateInvoiceTotals(
      {
        items: validLines.map((line) => ({
          productId: line.productId!,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          description: line.description,
        })),
        discountCents: this.discountCents,
        taxCents: this.taxCents,
      },
      { decimals: 0 },
    );
    return calculation;
  }

  private updateLine(id: string, changes: Partial<InvoiceLineDraft>) {
    this.lines = this.lines.map((line) => (line.id === id ? { ...line, ...changes } : line));
  }

  private removeLine(id: string) {
    if (this.lines.length === 1) return;
    this.lines = this.lines.filter((line) => line.id !== id);
  }

  private handleProductSelect(id: string, product: Product) {
    this.updateLine(id, {
      productId: product.id,
      unitPriceCents: product.unitPriceCents,
      description: product.description ?? undefined,
    });
  }

  private handleQuantityInput(id: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const value = Number.parseInt(target.value, 10);
    this.updateLine(id, { quantity: Number.isNaN(value) ? 1 : Math.max(1, value) });
  }

  private handlePriceChange(id: string, value: number) {
    this.updateLine(id, { unitPriceCents: value });
  }

  private handleDescriptionInput(id: string, event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateLine(id, { description: target.value || undefined });
  }

  private handleNotesInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.notes = target.value;
  }

  private handleStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (invoiceStatusSchema.safeParse(target.value).success) {
      this.status = target.value as InvoiceCreateInput['status'];
    }
  }

  private addLine() {
    const line = newLine();
    this.lines = [...this.lines, line];
    this.updateComplete.then(() => {
      const node = this.renderRoot.querySelector(`[data-line-id='${line.id}']`);
      if (node) {
        animate(
          node as Element,
          { opacity: [0, 1], y: [-6, 0] },
          { duration: 0.18, easing: 'ease-out' },
        );
      }
    });
  }

  private buildPayload(): InvoiceCreateInput | null {
    if (!this.customer) return null;
    const items = this.lines
      .filter((line) => line.productId && line.quantity > 0)
      .map((line) => ({
        productId: line.productId!,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        description: line.description,
      }));

    if (!items.length) return null;

    return {
      customerId: this.customer.id,
      status: this.status,
      discountCents: this.discountCents,
      taxCents: this.taxCents,
      notes: this.notes || undefined,
      items,
    };
  }

  private handleSubmit = (event: Event) => {
    event.preventDefault();
    const payload = this.buildPayload();
    if (!payload) {
      this.dispatchEvent(
        new CustomEvent('invoice-invalid', {
          detail: { reason: 'missing_fields' },
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }

    this.dispatchEvent(
      new CustomEvent<InvoiceCreateInput>('invoice-submit', {
        detail: payload,
        bubbles: true,
        composed: true,
      }),
    );
  };

  protected render() {
    const totals = this.totals;
    return html`
      <form @submit=${this.handleSubmit}>
        <header class="form-header">
          <div>
            <span class="eyebrow">Invoice details</span>
            <h2>Build your invoice</h2>
            <p>Add line items, apply adjustments, and review totals before sending.</p>
          </div>
          ${this.customer
            ? html`<dl class="customer-chip">
                <dt>Billing customer</dt>
                <dd>
                  <strong>${this.customer.name}</strong>
                  ${this.customer.email ? html`<span>${this.customer.email}</span>` : null}
                  ${this.customer.phone ? html`<span>${this.customer.phone}</span>` : null}
                </dd>
              </dl>`
            : null}
        </header>

        <section class="lines-section" aria-label="Line items">
          <div class="section-header">
            <h3>Line items</h3>
            <p>Select products, adjust details, and confirm pricing for this invoice.</p>
          </div>
          <div class="lines">
            ${this.lines.map((line, index) => {
              return html`
                <article class="line" data-line-id=${line.id}>
                  <header>
                    <span class="line-title">Item ${index + 1}</span>
                    <button
                      class="remove-button"
                      type="button"
                      ?disabled=${this.lines.length === 1}
                      @click=${() => this.removeLine(line.id)}
                      aria-label="Remove line ${index + 1}"
                    >
                      ✕
                    </button>
                  </header>
                  <div class="line-grid">
                    <div class="line-main">
                      <product-picker
                        .products=${this.products}
                        .value=${line.productId}
                        @product-select=${(event: CustomEvent<{ product: Product }>) =>
                          this.handleProductSelect(line.id, event.detail.product)}
                      ></product-picker>
                      <label>
                        <span>Description</span>
                        <input
                          type="text"
                          placeholder="Optional details"
                          .value=${line.description ?? ''}
                          @input=${(event: Event) => this.handleDescriptionInput(line.id, event)}
                        />
                      </label>
                    </div>
                    <label>
                      <span>Quantity</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        .value=${String(line.quantity)}
                        @input=${(event: Event) => this.handleQuantityInput(line.id, event)}
                      />
                    </label>
                    <money-input
                      label="Unit price"
                      .value=${line.unitPriceCents}
                      @value-change=${(event: CustomEvent<{ value: number }>) =>
                        this.handlePriceChange(line.id, event.detail.value)}
                    ></money-input>
                  </div>
                </article>
              `;
            })}
          </div>
          <button class="add-line" type="button" @click=${this.addLine}>
            <span aria-hidden="true">＋</span>
            <span>Add another item</span>
          </button>
        </section>

        <section class="adjustments" aria-label="Adjustments">
          <div class="section-header">
            <h3>Adjustments</h3>
            <p>Apply optional discounts or taxes. Totals update automatically.</p>
          </div>
          <div class="totals">
            <money-input
              label="Discount"
              .value=${this.discountCents}
              @value-change=${(event: CustomEvent<{ value: number }>) =>
                (this.discountCents = event.detail.value)}
            ></money-input>
            <money-input
              label="Tax"
              .value=${this.taxCents}
              @value-change=${(event: CustomEvent<{ value: number }>) =>
                (this.taxCents = event.detail.value)}
            ></money-input>
          </div>
        </section>

        <label class="notes-field">
          <span>Invoice notes</span>
          <textarea
            placeholder="Visible on the invoice"
            .value=${this.notes}
            @input=${this.handleNotesInput}
          ></textarea>
          <p class="helper">Share helpful context or payment instructions with your customer.</p>
        </label>

        <section class="summary" aria-live="polite">
          <div class="section-header">
            <h3>Invoice summary</h3>
            <p>We’ll keep totals in sync as you make updates.</p>
          </div>
          <dl class="summary-grid">
            <div>
              <dt>Subtotal</dt>
              <dd>${formatCurrency(totals.subTotalCents)}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>${formatCurrency(this.discountCents)}</dd>
            </div>
            <div>
              <dt>Tax</dt>
              <dd>${formatCurrency(this.taxCents)}</dd>
            </div>
            <div>
              <dt>Total due</dt>
              <dd class="total">${formatCurrency(totals.grandTotalCents)}</dd>
            </div>
          </dl>
        </section>

        <footer class="footer">
          <div class="status-field">
            <label for="invoice-status"><span>Status</span></label>
            <select id="invoice-status" .value=${this.status} @change=${this.handleStatusChange}>
              ${invoiceStatusSchema.options.map(
                (status) => html`<option value=${status}>${status}</option>`,
              )}
            </select>
            <p class="helper">Choose how this invoice should be created.</p>
          </div>
          <button type="submit" ?disabled=${this.submitting || !this.customer}>
            ${this.submitting ? 'Saving…' : 'Create invoice'}
          </button>
        </footer>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'invoice-form': InvoiceForm;
  }
}
