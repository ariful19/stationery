import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { calculateInvoiceTotals, invoiceStatusSchema, type InvoiceCreateInput } from '@stationery/shared';
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
  unitPriceCents: 0
});

@customElement('invoice-form')
export class InvoiceForm extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    form {
      display: grid;
      gap: var(--space-lg);
    }

    .lines {
      display: grid;
      gap: var(--space-md);
    }

    .line {
      display: grid;
      grid-template-columns: minmax(220px, 1.2fr) minmax(110px, 0.6fr) minmax(140px, 0.6fr) auto;
      gap: var(--space-md);
      align-items: end;
      padding: var(--space-md);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    .line-main {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .line-main input[type='text'] {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.9rem;
    }

    .line-main input[type='text']:focus-visible {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
      outline: none;
    }

    .line-actions {
      align-self: center;
      display: flex;
      gap: var(--space-xs);
    }

    .line-actions button {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      padding: var(--space-xs) var(--space-sm);
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }

    textarea {
      width: 100%;
      min-height: 80px;
      padding: var(--space-md);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      resize: vertical;
      font-family: inherit;
      font-size: 0.95rem;
    }

    textarea:focus-visible {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
      outline: none;
    }

    .summary {
      display: grid;
      gap: var(--space-sm);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      background: linear-gradient(160deg, rgba(37, 99, 235, 0.08), rgba(249, 115, 22, 0.08));
      border: 1px solid rgba(37, 99, 235, 0.16);
    }

    .totals {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-lg);
      align-items: start;
    }

    .summary dl {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--space-sm) var(--space-lg);
      margin: 0;
    }

    .summary dt {
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }

    .summary dd {
      margin: 0;
      font-weight: 600;
    }

    .footer {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-md);
      align-items: center;
    }

    select {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      padding: var(--space-sm) var(--space-md);
      background: var(--color-surface);
      font-size: 0.9rem;
    }

    .footer button[type='submit'] {
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: white;
      border: 1px solid var(--color-primary-strong);
      padding: var(--space-md) var(--space-xl);
      font-size: 1rem;
      box-shadow: 0 12px 30px rgba(37, 99, 235, 0.2);
    }

    @media (max-width: 720px) {
      .line {
        grid-template-columns: 1fr;
      }

      .line-actions {
        justify-content: flex-end;
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
    const validLines = this.lines.filter(line => line.productId && line.quantity > 0);
    const calculation = calculateInvoiceTotals(
      {
        items: validLines.map(line => ({
          productId: line.productId!,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          description: line.description
        })),
        discountCents: this.discountCents,
        taxCents: this.taxCents
      },
      { decimals: 0 }
    );
    return calculation;
  }

  private updateLine(id: string, changes: Partial<InvoiceLineDraft>) {
    this.lines = this.lines.map(line => (line.id === id ? { ...line, ...changes } : line));
  }

  private removeLine(id: string) {
    if (this.lines.length === 1) return;
    this.lines = this.lines.filter(line => line.id !== id);
  }

  private handleProductSelect(id: string, product: Product) {
    this.updateLine(id, {
      productId: product.id,
      unitPriceCents: product.unitPriceCents,
      description: product.description ?? undefined
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
        animate(node as Element, { opacity: [0, 1], y: [-6, 0] }, { duration: 0.18, easing: 'ease-out' });
      }
    });
  }

  private buildPayload(): InvoiceCreateInput | null {
    if (!this.customer) return null;
    const items = this.lines
      .filter(line => line.productId && line.quantity > 0)
      .map(line => ({
        productId: line.productId!,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        description: line.description
      }));

    if (!items.length) return null;

    return {
      customerId: this.customer.id,
      status: this.status,
      discountCents: this.discountCents,
      taxCents: this.taxCents,
      notes: this.notes || undefined,
      items
    };
  }

  private handleSubmit = (event: Event) => {
    event.preventDefault();
    const payload = this.buildPayload();
    if (!payload) {
      this.dispatchEvent(
        new CustomEvent('invoice-invalid', { detail: { reason: 'missing_fields' }, bubbles: true, composed: true })
      );
      return;
    }

    this.dispatchEvent(
      new CustomEvent<InvoiceCreateInput>('invoice-submit', {
        detail: payload,
        bubbles: true,
        composed: true
      })
    );
  };

  protected render() {
    const totals = this.totals;
    return html`
      <form @submit=${this.handleSubmit}>
        <div class="lines">
          ${this.lines.map(line => {
            return html`
              <div class="line" data-line-id=${line.id}>
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
                <div class="line-actions">
                  <button type="button" @click=${() => this.removeLine(line.id)} aria-label="Remove line">✕</button>
                </div>
              </div>
            `;
          })}
          <button type="button" @click=${this.addLine}>➕ Add item</button>
        </div>

        <div class="totals">
          <money-input
            label="Discount"
            .value=${this.discountCents}
            @value-change=${(event: CustomEvent<{ value: number }>) => (this.discountCents = event.detail.value)}
          ></money-input>
          <money-input
            label="Tax"
            .value=${this.taxCents}
            @value-change=${(event: CustomEvent<{ value: number }>) => (this.taxCents = event.detail.value)}
          ></money-input>
        </div>

        <label>
          <span>Notes</span>
          <textarea
            placeholder="Visible on the invoice"
            .value=${this.notes}
            @input=${this.handleNotesInput}
          ></textarea>
        </label>

        <div class="summary" aria-live="polite">
          <h3>Invoice summary</h3>
          <dl>
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
              <dd>${formatCurrency(totals.grandTotalCents)}</dd>
            </div>
          </dl>
        </div>

        <div class="footer">
          <label>
            <span>Status</span>
            <select .value=${this.status} @change=${this.handleStatusChange}>
              ${invoiceStatusSchema.options.map(status => html`<option value=${status}>${status}</option>`)}
            </select>
          </label>
          <button type="submit" ?disabled=${this.submitting || !this.customer}>
            ${this.submitting ? 'Saving…' : 'Create invoice'}
          </button>
        </div>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'invoice-form': InvoiceForm;
  }
}
