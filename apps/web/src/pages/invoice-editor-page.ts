import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  createInvoice,
  fetchCustomers,
  fetchProducts,
  type Customer,
  type CustomerListResponse,
  type Invoice,
} from '../api/client.js';
import '../components/invoice-form.js';
import '../components/pdf-preview.js';
import '../components/customer-list.js';
import type { InvoiceCreateInput } from '@stationery/shared';
import { formatCurrency } from '../utils/format.js';

@customElement('invoice-editor-page')
export class InvoiceEditorPage extends LitElement {
  static styles = css`
    :host {
      display: grid;
      gap: var(--space-2xl);
    }

    .hero {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-xl);
      background: linear-gradient(165deg, rgba(37, 99, 235, 0.16), rgba(249, 115, 22, 0.06)),
        var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid rgba(37, 99, 235, 0.14);
      padding: var(--space-2xl);
      box-shadow: var(--shadow-md);
    }

    .hero-text {
      display: grid;
      gap: var(--space-sm);
      max-width: 520px;
    }

    .hero-text h1 {
      margin: 0;
      font-size: 2rem;
      letter-spacing: -0.01em;
    }

    .hero-text p {
      margin: 0;
      color: var(--color-text-muted);
      line-height: 1.6;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--color-primary);
      font-weight: 600;
    }

    .hero-card {
      background: rgba(255, 255, 255, 0.82);
      border-radius: var(--radius-lg);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: var(--shadow-sm);
      padding: var(--space-xl);
      min-width: 260px;
      display: grid;
      gap: var(--space-sm);
    }

    .hero-card dt {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      margin: 0;
    }

    .hero-card dd {
      margin: 0;
      display: grid;
      gap: 4px;
    }

    .hero-card strong {
      font-size: 1.1rem;
      letter-spacing: -0.01em;
    }

    .hero-card span {
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);
      gap: var(--space-2xl);
      align-items: start;
    }

    invoice-form {
      display: block;
    }

    .summary {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid rgba(22, 163, 74, 0.4);
      padding: var(--space-2xl);
      box-shadow: var(--shadow-md);
      display: grid;
      gap: var(--space-xl);
    }

    .summary header {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      flex-wrap: wrap;
    }

    .summary header h3 {
      margin: 0;
      font-size: 1.5rem;
      letter-spacing: -0.01em;
    }

    .summary header p {
      margin: 0;
      color: var(--color-text-muted);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-xs);
      padding: var(--space-xs) var(--space-sm);
      border-radius: 999px;
      background: rgba(22, 163, 74, 0.16);
      color: var(--color-positive);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--space-lg);
      margin: 0;
    }

    .summary-grid dt {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      margin-bottom: var(--space-xs);
    }

    .summary-grid dd {
      margin: 0;
      font-weight: 600;
      font-size: 1.05rem;
    }

    .actions {
      display: flex;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .actions button {
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface-strong);
      padding: var(--space-sm) var(--space-lg);
      font-weight: 600;
      transition:
        transform var(--transition-snappy),
        box-shadow var(--transition-snappy),
        border-color var(--transition-snappy),
        color var(--transition-snappy);
    }

    .actions button:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      box-shadow: 0 8px 18px rgba(37, 99, 235, 0.1);
      transform: translateY(-1px);
    }

    .actions .primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
      box-shadow: 0 14px 30px rgba(37, 99, 235, 0.25);
    }

    .actions .primary:hover {
      color: #fff;
      background: var(--color-primary-strong);
      border-color: var(--color-primary-strong);
    }

    .preview {
      border-radius: var(--radius-md);
      border: 1px dashed rgba(37, 99, 235, 0.25);
      background: var(--color-surface-strong);
      padding: var(--space-md);
    }

    pdf-preview {
      width: 100%;
      display: block;
      border-radius: var(--radius-sm);
      overflow: hidden;
    }

    @media (max-width: 1000px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .hero {
        padding: var(--space-xl);
      }

      .hero-text h1 {
        font-size: 1.6rem;
      }
    }
  `;

  @property({ type: Number })
  prefillCustomerId?: number;

  @state()
  private customers: Customer[] = [];

  @state()
  private products: Awaited<ReturnType<typeof fetchProducts>>['data'] = [];

  @state()
  private selectedCustomer?: Customer;

  @state()
  private submitting = false;

  @state()
  private lastInvoice?: Invoice;

  @state()
  private customerPagination?: CustomerListResponse['pagination'];

  @state()
  private loading = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.load();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('prefillCustomerId') && this.prefillCustomerId) {
      const found = this.customers.find((customer) => customer.id === this.prefillCustomerId);
      if (found) {
        this.selectedCustomer = found;
      }
    }
  }

  private async load() {
    this.loading = true;
    try {
      const [customerResponse, productResponse] = await Promise.all([
        fetchCustomers({ limit: 100, sort: 'name', direction: 'asc' }),
        fetchProducts({ limit: 100, sort: 'name', direction: 'asc' }),
      ]);
      this.customers = customerResponse.data;
      this.customerPagination = customerResponse.pagination;
      this.products = productResponse.data;
      if (!this.selectedCustomer && this.prefillCustomerId) {
        this.selectedCustomer = this.customers.find(
          (customer) => customer.id === this.prefillCustomerId,
        );
      }
      if (!this.selectedCustomer && this.customers.length) {
        this.selectedCustomer = this.customers[0];
      }
    } catch (error) {
      console.error('Failed to load invoice editor data', error);
    } finally {
      this.loading = false;
    }
  }

  private handleCustomerSelect(event: CustomEvent<{ customer: Customer }>) {
    this.selectedCustomer = event.detail.customer;
  }

  private async handleSubmit(event: CustomEvent<InvoiceCreateInput>) {
    if (!this.selectedCustomer) return;
    this.submitting = true;
    try {
      const invoice = await createInvoice(event.detail);
      this.lastInvoice = invoice;
      this.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: 'Invoice created successfully', type: 'success' },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error) {
      console.error('Failed to create invoice', error);
    } finally {
      this.submitting = false;
    }
  }

  private goToPayments() {
    if (!this.lastInvoice) return;
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: `/payments?invoice=${this.lastInvoice.id}`,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private goToPdf() {
    if (!this.lastInvoice) return;
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: `/reports?invoice=${this.lastInvoice.id}`,
        bubbles: true,
        composed: true,
      }),
    );
  }

  protected render() {
    return html`
      <section class="hero">
        <div class="hero-text">
          <span class="eyebrow">Invoice builder</span>
          <h1>New invoice</h1>
          <p>
            Choose a customer, add products, and confirm the totals before creating the invoice.
          </p>
        </div>
        ${this.selectedCustomer
          ? html`<dl class="hero-card">
              <dt>Billing customer</dt>
              <dd>
                <strong>${this.selectedCustomer.name}</strong>
                ${this.selectedCustomer.email
                  ? html`<span>${this.selectedCustomer.email}</span>`
                  : null}
                ${this.selectedCustomer.phone
                  ? html`<span>${this.selectedCustomer.phone}</span>`
                  : null}
              </dd>
            </dl>`
          : html`<dl class="hero-card">
              <dt>Next step</dt>
              <dd>
                <strong>Select a customer</strong>
                <span>Pick someone from the list to begin building this invoice.</span>
              </dd>
            </dl>`}
      </section>
      <div class="layout">
        <customer-list
          .customers=${this.customers}
          .selectedId=${this.selectedCustomer?.id}
          .loading=${this.loading}
          @customer-selected=${this.handleCustomerSelect}
        ></customer-list>
        <invoice-form
          .customer=${this.selectedCustomer}
          .products=${this.products}
          .submitting=${this.submitting}
          @invoice-submit=${this.handleSubmit}
        ></invoice-form>
      </div>
      ${this.lastInvoice
        ? html`<section class="summary">
            <header>
              <span class="badge">Success</span>
              <div>
                <h3>Invoice ${this.lastInvoice.invoiceNo} created</h3>
                <p>You're ready to share it or record a payment.</p>
              </div>
            </header>
            <dl class="summary-grid">
              <div>
                <dt>Customer</dt>
                <dd>${this.lastInvoice.customer?.name ?? this.selectedCustomer?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>${formatCurrency(this.lastInvoice.grandTotalCents)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>${this.lastInvoice.status}</dd>
              </div>
            </dl>
            <div class="actions">
              <button class="primary" type="button" @click=${this.goToPayments}>
                Record payment
              </button>
              <button type="button" @click=${this.goToPdf}>Open reports</button>
            </div>
            <div class="preview">
              <pdf-preview .invoiceId=${this.lastInvoice.id} auto></pdf-preview>
            </div>
          </section>`
        : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'invoice-editor-page': InvoiceEditorPage;
  }
}
