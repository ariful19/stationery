import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  fetchCustomers,
  fetchInvoices,
  requestInvoicePdf,
  type Customer,
  type Invoice,
  type InvoiceListResponse,
} from '../api/client.js';
import { formatCurrency, formatDate, formatInvoiceStatus } from '../utils/format.js';

type InvoiceFilters = {
  query: string;
  statuses: Set<Invoice['status']>;
  customerId?: number;
  from?: string;
  to?: string;
};

const LIMIT = 20;

const ALL_STATUSES: Invoice['status'][] = ['draft', 'issued', 'partial', 'paid', 'void'];

@customElement('invoices-page')
export class InvoicesPage extends LitElement {
  static styles = css`
    :host {
      display: grid;
      gap: var(--space-xl);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(280px, 340px) 1fr;
      gap: var(--space-xl);
    }

    form {
      display: grid;
      gap: var(--space-md);
      background: var(--color-surface);
      padding: var(--space-xl);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }

    form h3 {
      margin: 0;
      font-size: 1.1rem;
      letter-spacing: -0.01em;
    }

    label {
      display: grid;
      gap: var(--space-2xs);
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }

    input,
    select {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.95rem;
    }

    .status-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: var(--space-xs);
    }

    .status-options label {
      display: flex;
      align-items: center;
      gap: var(--space-2xs);
      font-size: 0.8rem;
      padding: var(--space-2xs) var(--space-xs);
      background: var(--color-surface-strong);
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
    }

    .status-options input[type='checkbox'] {
      margin: 0;
    }

    .date-range {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-sm);
    }

    .form-actions {
      display: flex;
      gap: var(--space-sm);
      flex-wrap: wrap;
    }

    .form-actions button {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface-strong);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.9rem;
    }

    .results {
      display: grid;
      gap: var(--space-lg);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    th,
    td {
      padding: var(--space-md) var(--space-lg);
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.9rem;
    }

    th {
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      background: rgba(37, 99, 235, 0.08);
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    tbody tr {
      cursor: pointer;
      transition: background 120ms ease;
    }

    tbody tr:hover {
      background: rgba(37, 99, 235, 0.08);
    }

    tbody tr[selected] {
      background: rgba(37, 99, 235, 0.12);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0 var(--space-sm);
      height: 24px;
      border-radius: 12px;
      font-size: 0.75rem;
      background: rgba(37, 99, 235, 0.12);
      color: var(--color-primary-strong);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .details {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      padding: var(--space-xl);
      display: grid;
      gap: var(--space-lg);
    }

    .details .header {
      display: flex;
      gap: var(--space-sm);
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .details .title {
      display: flex;
      gap: var(--space-sm);
      align-items: center;
      flex-wrap: wrap;
    }

    .details .actions {
      display: flex;
      gap: var(--space-xs);
      align-items: center;
      flex-wrap: wrap;
    }

    .details .actions button {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface-strong);
      padding: var(--space-xs) var(--space-sm);
      font-size: 0.85rem;
      color: var(--color-text);
    }

    .details h3 {
      margin: 0;
      font-size: 1.2rem;
      letter-spacing: -0.01em;
    }

    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--space-sm) var(--space-lg);
    }

    .meta dt {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .meta dd {
      margin: 0;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .items,
    .payments {
      border-top: 1px solid var(--color-border);
      padding-top: var(--space-md);
      display: grid;
      gap: var(--space-sm);
    }

    .notes {
      border-top: 1px solid var(--color-border);
      padding-top: var(--space-md);
    }

    .notes p {
      margin: 0;
      color: var(--color-text-muted);
      line-height: 1.5;
    }

    .pdf-error {
      margin: 0;
      color: var(--color-danger, #dc2626);
      font-size: 0.85rem;
    }

    .items table,
    .payments table {
      box-shadow: none;
      border: none;
    }

    .empty-state {
      display: grid;
      gap: var(--space-sm);
      justify-items: center;
      text-align: center;
      padding: var(--space-xl);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px dashed var(--color-border);
      color: var(--color-text-muted);
    }

    .load-more {
      justify-self: start;
      border-radius: var(--radius-md);
      background: var(--color-surface-strong);
      border: 1px solid var(--color-border);
      padding: var(--space-sm) var(--space-lg);
      font-size: 0.9rem;
    }

    @media (max-width: 1100px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
  `;

  @state()
  private invoices: Invoice[] = [];

  @state()
  private customers: Customer[] = [];

  @state()
  private pagination?: InvoiceListResponse['pagination'];

  @state()
  private loading = false;

  @state()
  private selected?: Invoice;

  @state()
  private filters: InvoiceFilters = {
    query: '',
    statuses: new Set(),
  };

  @state()
  private pdfLoading = false;

  @state()
  private pdfError?: string;

  connectedCallback(): void {
    super.connectedCallback();
    this.loadCustomers();
    this.loadInvoices();
  }

  private async loadCustomers() {
    try {
      const response = await fetchCustomers({ limit: 100, sort: 'name', direction: 'asc' });
      this.customers = response.data;
    } catch (error) {
      console.error('Failed to load customers for filters', error);
    }
  }

  private async loadInvoices(options: { append?: boolean; offset?: number } = {}) {
    const { append = false, offset } = options;
    const limit = LIMIT;
    const queryPayload = {
      limit,
      offset: offset ?? (append ? this.invoices.length : 0),
      query: this.filters.query || undefined,
      status:
        this.filters.statuses.size > 0
          ? (Array.from(this.filters.statuses) as Invoice['status'][])
          : undefined,
      customerId: this.filters.customerId,
      from: this.filters.from,
      to: this.filters.to,
      sort: 'issueDate' as const,
      direction: 'desc' as const,
    };

    this.loading = true;
    try {
      const response = await fetchInvoices(queryPayload);
      this.pagination = response.pagination;
      this.invoices = append ? [...this.invoices, ...response.data] : response.data;
      if (!this.selected || !append) {
        this.selected = this.invoices[0];
        this.resetPdfState();
      }
    } catch (error) {
      console.error('Failed to load invoices', error);
    } finally {
      this.loading = false;
    }
  }

  private handleFilterSubmit(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const statuses = new Set<Invoice['status']>();
    for (const status of ALL_STATUSES) {
      if (formData.getAll('status').includes(status)) {
        statuses.add(status);
      }
    }

    const customerIdRaw = String(formData.get('customerId') ?? '');
    const customerId = customerIdRaw ? Number.parseInt(customerIdRaw, 10) : undefined;

    const nextFilters: InvoiceFilters = {
      query: String(formData.get('query') ?? '').trim(),
      statuses,
      customerId: Number.isFinite(customerId) ? customerId : undefined,
      from: (formData.get('from') as string | null) || undefined,
      to: (formData.get('to') as string | null) || undefined,
    };

    this.filters = nextFilters;
    this.loadInvoices({ append: false, offset: 0 });
  }

  private resetFilters() {
    this.filters = {
      query: '',
      statuses: new Set(),
    };
    const form = this.renderRoot.querySelector('form');
    form?.reset();
    this.loadInvoices({ append: false, offset: 0 });
  }

  private toggleStatus(status: Invoice['status']) {
    const next = new Set(this.filters.statuses);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    this.filters = {
      ...this.filters,
      statuses: next,
    };
    this.loadInvoices({ append: false, offset: 0 });
  }

  private selectInvoice(invoice: Invoice) {
    this.selected = invoice;
    this.resetPdfState();
  }

  private canLoadMore() {
    if (!this.pagination) return false;
    return this.pagination.offset + this.pagination.limit < this.pagination.total;
  }

  private resetPdfState() {
    this.pdfError = undefined;
    this.pdfLoading = false;
  }

  private async viewInvoicePdf(invoiceId: number) {
    this.pdfLoading = true;
    this.pdfError = undefined;
    try {
      const blob = await requestInvoicePdf(invoiceId);
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      this.pdfError = error instanceof Error ? error.message : 'Failed to open PDF';
    } finally {
      this.pdfLoading = false;
    }
  }

  protected render() {
    return html`
      <div class="layout">
        <form @submit=${(event: Event) => this.handleFilterSubmit(event)}>
          <h3>Filter invoices</h3>
          <label>
            <span>Search by invoice number</span>
            <input
              type="search"
              name="query"
              placeholder="INV-2024-001"
              .value=${this.filters.query}
            />
          </label>
          <label>
            <span>Customer</span>
            <select name="customerId" .value=${String(this.filters.customerId ?? '')}>
              <option value="">All customers</option>
              ${this.customers.map(
                (customer) => html`<option value=${customer.id}>${customer.name}</option>`,
              )}
            </select>
          </label>
          <label>
            <span>Status</span>
            <div class="status-options">
              ${ALL_STATUSES.map(
                (status) => html`
                  <label>
                    <input
                      type="checkbox"
                      name="status"
                      value=${status}
                      ?checked=${this.filters.statuses.has(status)}
                      @change=${() => this.toggleStatus(status)}
                    />
                    <span>${formatInvoiceStatus(status)}</span>
                  </label>
                `,
              )}
            </div>
          </label>
          <div class="date-range">
            <label>
              <span>From date</span>
              <input type="date" name="from" .value=${this.filters.from ?? ''} />
            </label>
            <label>
              <span>To date</span>
              <input type="date" name="to" .value=${this.filters.to ?? ''} />
            </label>
          </div>
          <div class="form-actions">
            <button type="submit">Apply filters</button>
            <button type="button" @click=${() => this.resetFilters()}>Clear</button>
          </div>
        </form>

        <div class="results">
          ${this.renderResults()}
        </div>
      </div>
    `;
  }

  private renderResults() {
    if (this.loading && this.invoices.length === 0) {
      return html`<div class="empty-state">
        <strong>Loading invoices…</strong>
        <span>Please wait while we fetch the latest records.</span>
      </div>`;
    }

    if (!this.loading && this.invoices.length === 0) {
      return html`<div class="empty-state">
        <strong>No invoices found</strong>
        <span>Try adjusting your filters or create a new invoice.</span>
      </div>`;
    }

    return html`
      <div>
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Issued</th>
              <th>Status</th>
              <th>Total</th>
              <th>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            ${this.invoices.map((invoice) => {
              const outstanding = invoice.grandTotalCents - invoice.payments.reduce((total, payment) => total + payment.amountCents, 0);
              return html`
                <tr
                  ?selected=${this.selected?.id === invoice.id}
                  @click=${() => this.selectInvoice(invoice)}
                >
                  <td>${invoice.invoiceNo}</td>
                  <td>${invoice.customer?.name ?? '—'}</td>
                  <td>${formatDate(invoice.issueDate)}</td>
                  <td><span class="status-badge">${formatInvoiceStatus(invoice.status)}</span></td>
                  <td>${formatCurrency(invoice.grandTotalCents)}</td>
                  <td>${formatCurrency(outstanding)}</td>
                </tr>
              `;
            })}
          </tbody>
        </table>
        ${this.canLoadMore()
          ? html`<button class="load-more" ?disabled=${this.loading} @click=${() => this.loadInvoices({ append: true })}>
              ${this.loading ? 'Loading…' : 'Load more'}
            </button>`
          : nothing}
      </div>
      ${this.selected ? this.renderDetails(this.selected) : nothing}
    `;
  }

  private renderDetails(invoice: Invoice) {
    const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    const outstanding = invoice.grandTotalCents - totalPaid;

    return html`
      <section class="details">
        <div class="header">
          <div class="title">
            <h3>${invoice.invoiceNo}</h3>
            <span class="status-badge">${formatInvoiceStatus(invoice.status)}</span>
          </div>
          <div class="actions">
            <button
              type="button"
              @click=${() => this.viewInvoicePdf(invoice.id)}
              ?disabled=${this.pdfLoading}
            >
              ${this.pdfLoading ? 'Opening…' : 'View as PDF'}
            </button>
          </div>
        </div>
        ${this.pdfError ? html`<p class="pdf-error" role="alert">${this.pdfError}</p>` : nothing}
        <dl class="meta">
          <div>
            <dt>Customer</dt>
            <dd>${invoice.customer?.name ?? 'Unknown'}</dd>
          </div>
          <div>
            <dt>Issue date</dt>
            <dd>${formatDate(invoice.issueDate)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>${formatCurrency(invoice.grandTotalCents)}</dd>
          </div>
          <div>
            <dt>Paid</dt>
            <dd>${formatCurrency(totalPaid)}</dd>
          </div>
          <div>
            <dt>Outstanding</dt>
            <dd>${formatCurrency(outstanding)}</dd>
          </div>
        </dl>

        <div class="items">
          <h4>Line items</h4>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit price</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(
                (item) => html`
                  <tr>
                    <td>${item.description ?? item.productId}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unitPriceCents)}</td>
                    <td>${formatCurrency(item.lineTotalCents)}</td>
                  </tr>
                `,
              )}
            </tbody>
          </table>
        </div>

        <div class="payments">
          <h4>Payments</h4>
          ${invoice.payments.length
            ? html`<table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.payments.map(
                    (payment) => html`
                      <tr>
                        <td>${formatDate(payment.paidAt)}</td>
                        <td>${formatCurrency(payment.amountCents)}</td>
                        <td>${payment.method}</td>
                        <td>${payment.note ?? '—'}</td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>`
            : html`<p>No payments recorded yet.</p>`}
        </div>

        ${invoice.notes
          ? html`<div class="notes">
              <h4>Notes</h4>
              <p>${invoice.notes}</p>
            </div>`
          : nothing}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'invoices-page': InvoicesPage;
  }
}

