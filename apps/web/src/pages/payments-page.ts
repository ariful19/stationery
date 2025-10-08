import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  createPayment,
  fetchCustomers,
  fetchInvoices,
  fetchPayments,
  type Customer,
  type Invoice,
  type Payment,
  type PaymentCreateInput,
} from '../api/client.js';
import { formatCurrency, formatDate } from '../utils/format.js';

@customElement('payments-page')
export class PaymentsPage extends LitElement {
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

    form {
      display: grid;
      gap: var(--space-sm);
      background: var(--color-surface);
      padding: var(--space-xl);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }

    form h3 {
      margin: 0;
      font-size: 1.1rem;
    }

    label {
      display: grid;
      gap: var(--space-2xs);
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }

    select,
    input,
    textarea {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.95rem;
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

    button[type='submit'] {
      margin-top: var(--space-md);
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: white;
      border: 1px solid var(--color-primary-strong);
      padding: var(--space-sm) var(--space-lg);
      font-size: 0.95rem;
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.2);
    }

    @media (max-width: 980px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
  `;

  @property({ type: Number })
  customer?: number;

  @state()
  private payments: Payment[] = [];

  @state()
  private customers: Customer[] = [];

  @state()
  private invoices: Invoice[] = [];

  @state()
  private creating = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.load();
  }

  private async load() {
    try {
      const [payments, customers, invoices] = await Promise.all([
        fetchPayments({ limit: 50, direction: 'desc' }),
        fetchCustomers({ limit: 100, sort: 'name', direction: 'asc' }),
        fetchInvoices({ limit: 100, sort: 'issueDate', direction: 'desc' }),
      ]);
      this.payments = payments.data;
      this.customers = customers.data;
      this.invoices = invoices.data;
    } catch (error) {
      console.error('Failed to load payments data', error);
    }
  }

  private async handleSubmit(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const customerId = Number.parseInt(String(formData.get('customerId') ?? '0'), 10);
    if (!Number.isFinite(customerId) || customerId <= 0) return;

    const invoiceIdRaw = String(formData.get('invoiceId') ?? '');
    const invoiceId = invoiceIdRaw ? Number.parseInt(invoiceIdRaw, 10) : undefined;

    const amount = Number.parseInt(String(formData.get('amountCents') ?? '0'), 10);

    const payload: PaymentCreateInput = {
      customerId,
      invoiceId: invoiceId && Number.isFinite(invoiceId) ? invoiceId : undefined,
      amountCents: Number.isNaN(amount) ? 0 : amount,
      method: (formData.get('method') as PaymentCreateInput['method']) ?? 'cash',
      note: (formData.get('note') as string | null)?.trim() || undefined,
    };

    if (payload.amountCents <= 0) return;

    this.creating = true;
    const optimistic: Payment = {
      id: Date.now() * -1,
      ...payload,
      paidAt: new Date().toISOString(),
    };
    this.payments = [optimistic, ...this.payments];
    form.reset();

    try {
      const created = await createPayment(payload);
      this.payments = [created, ...this.payments.filter((payment) => payment.id !== optimistic.id)];
    } catch (error) {
      console.error('Failed to create payment', error);
      this.payments = this.payments.filter((payment) => payment.id !== optimistic.id);
    } finally {
      this.creating = false;
    }
  }

  protected render() {
    return html`
      <div class="layout">
        <form @submit=${(event: Event) => this.handleSubmit(event)}>
          <h3>Record payment</h3>
          <label>
            <span>Customer</span>
            <select name="customerId" required .value=${String(this.customer ?? '')}>
              <option value="">Select customer</option>
              ${this.customers.map(
                (customer) => html`<option value=${customer.id}>${customer.name}</option>`,
              )}
            </select>
          </label>
          <label>
            <span>Invoice</span>
            <select name="invoiceId">
              <option value="">Unallocated</option>
              ${this.invoices.map(
                (invoice) => html`<option value=${invoice.id}>${invoice.invoiceNo}</option>`,
              )}
            </select>
          </label>
          <label>
            <span>Amount (cents)</span>
            <input name="amountCents" type="number" min="1" step="1" required />
          </label>
          <label>
            <span>Method</span>
            <select name="method">
              <option value="cash">Cash</option>
              <option value="bkash">bKash</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <span>Note</span>
            <textarea name="note" placeholder="Optional"></textarea>
          </label>
          <button type="submit" ?disabled=${this.creating}>
            ${this.creating ? 'Saving…' : 'Save payment'}
          </button>
        </form>
        <div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              ${this.payments.map((payment) => {
                const customer = this.customers.find((item) => item.id === payment.customerId);
                const invoice = this.invoices.find((item) => item.id === payment.invoiceId);
                return html`<tr>
                  <td>
                    ${formatDate(payment.paidAt, undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td>${customer?.name ?? payment.customerId}</td>
                  <td>${invoice?.invoiceNo ?? '—'}</td>
                  <td>${formatCurrency(payment.amountCents)}</td>
                  <td>${payment.method}</td>
                </tr>`;
              })}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'payments-page': PaymentsPage;
  }
}
