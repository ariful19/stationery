import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  createInvoice,
  fetchCustomers,
  fetchProducts,
  type Customer,
  type CustomerListResponse,
  type Invoice
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
      gap: var(--space-xl);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(320px, 360px) 1fr;
      gap: var(--space-xl);
    }

    .summary {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      padding: var(--space-xl);
      box-shadow: var(--shadow-sm);
      display: grid;
      gap: var(--space-md);
    }

    .summary h3 {
      margin: 0;
      font-size: 1.2rem;
    }

    .summary dl {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--space-sm) var(--space-lg);
      margin: 0;
    }

    .summary dt {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .summary dd {
      margin: 0;
      font-weight: 600;
    }

    .success {
      border-radius: var(--radius-lg);
      padding: var(--space-lg);
      background: rgba(22, 163, 74, 0.1);
      border: 1px solid rgba(22, 163, 74, 0.3);
      color: var(--color-positive);
    }

    .actions {
      display: flex;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .actions button {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface-strong);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.9rem;
    }

    @media (max-width: 1000px) {
      .layout {
        grid-template-columns: 1fr;
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
      const found = this.customers.find(customer => customer.id === this.prefillCustomerId);
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
        fetchProducts({ limit: 100, sort: 'name', direction: 'asc' })
      ]);
      this.customers = customerResponse.data;
      this.customerPagination = customerResponse.pagination;
      this.products = productResponse.data;
      if (!this.selectedCustomer && this.prefillCustomerId) {
        this.selectedCustomer = this.customers.find(customer => customer.id === this.prefillCustomerId);
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
          composed: true
        })
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
        composed: true
      })
    );
  }

  private goToPdf() {
    if (!this.lastInvoice) return;
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: `/reports?invoice=${this.lastInvoice.id}`,
        bubbles: true,
        composed: true
      })
    );
  }

  protected render() {
    return html`
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
            <div class="success">Invoice ${this.lastInvoice.invoiceNo} created.</div>
            <dl>
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
              <button type="button" @click=${this.goToPayments}>Record payment</button>
              <button type="button" @click=${this.goToPdf}>Reports</button>
            </div>
            <pdf-preview .invoiceId=${this.lastInvoice.id} auto></pdf-preview>
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
