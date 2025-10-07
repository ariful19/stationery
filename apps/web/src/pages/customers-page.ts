import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  createCustomer,
  fetchCustomers,
  type Customer,
  type CustomerCreateInput,
  type CustomerListResponse
} from '../api/client.js';
import '../components/customer-list.js';
import { formatRelativeDate } from '../utils/format.js';

@customElement('customers-page')
export class CustomersPage extends LitElement {
  static styles = css`
    :host {
      display: grid;
      gap: var(--space-xl);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(320px, 420px) 1fr;
      gap: var(--space-xl);
    }

    form {
      display: grid;
      gap: var(--space-sm);
      background: var(--color-surface);
      padding: var(--space-xl);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-border);
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
    textarea {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.95rem;
    }

    textarea {
      min-height: 90px;
      resize: vertical;
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

    .details {
      display: grid;
      gap: var(--space-lg);
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      padding: var(--space-xl);
      border: 1px solid var(--color-border);
    }

    .details h3 {
      margin: 0;
      font-size: 1.2rem;
    }

    .details dl {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: var(--space-sm) var(--space-lg);
      margin: 0;
    }

    .details dt {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .details dd {
      margin: 0;
      font-weight: 600;
    }

    .actions {
      display: flex;
      gap: var(--space-sm);
    }

    .actions button {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface-strong);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.9rem;
    }

    @media (max-width: 980px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
  `;

  @state()
  private customers: Customer[] = [];

  @state()
  private pagination?: CustomerListResponse['pagination'];

  @state()
  private loading = false;

  @state()
  private creating = false;

  @state()
  private selected?: Customer;

  connectedCallback(): void {
    super.connectedCallback();
    this.load();
  }

  private async load() {
    this.loading = true;
    try {
      const response = await fetchCustomers({ limit: 20, sort: 'createdAt' });
      this.customers = response.data;
      this.pagination = response.pagination;
      if (!this.selected && response.data.length) {
        this.selected = response.data[0];
      }
    } catch (error) {
      console.error('Failed to load customers', error);
    } finally {
      this.loading = false;
    }
  }

  private async handleCreate(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const payload: CustomerCreateInput = {
      name: String(formData.get('name') ?? '').trim(),
      email: (formData.get('email') as string | null)?.trim() || undefined,
      phone: (formData.get('phone') as string | null)?.trim() || undefined,
      address: (formData.get('address') as string | null)?.trim() || undefined
    };

    if (!payload.name) return;

    const optimistic: Customer = {
      id: Date.now() * -1,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      createdAt: new Date().toISOString()
    };

    this.creating = true;
    this.customers = [optimistic, ...this.customers];
    this.selected = optimistic;
    form.reset();

    try {
      const created = await createCustomer(payload);
      this.customers = [created, ...this.customers.filter(customer => customer.id !== optimistic.id)];
      this.selected = created;
    } catch (error) {
      console.error('Failed to create customer', error);
      this.customers = this.customers.filter(customer => customer.id !== optimistic.id);
    } finally {
      this.creating = false;
    }
  }

  private handleSelect(event: CustomEvent<{ customer: Customer }>) {
    this.selected = event.detail.customer;
  }

  private goToInvoice() {
    if (!this.selected) return;
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: `/invoices/new?customerId=${this.selected.id}`,
        bubbles: true,
        composed: true
      })
    );
  }

  private goToPayments() {
    if (!this.selected) return;
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: `/payments?customer=${this.selected.id}`,
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
          .selectedId=${this.selected?.id}
          .loading=${this.loading}
          @customer-selected=${this.handleSelect}
        ></customer-list>
        <div class="details">
          <div>
            <h3>${this.selected?.name ?? 'Select a customer'}</h3>
            ${this.selected
              ? html`<p>Customer since ${formatRelativeDate(this.selected.createdAt)}</p>`
              : html`<p>Pick a customer to view contact information and quick actions.</p>`}
          </div>
          ${this.selected
            ? html`<dl>
                <div>
                  <dt>Email</dt>
                  <dd>${this.selected.email ?? '—'}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>${this.selected.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>${this.selected.address ?? '—'}</dd>
                </div>
              </dl>
              <div class="actions">
                <button type="button" @click=${this.goToInvoice}>Start invoice</button>
                <button type="button" @click=${this.goToPayments}>Record payment</button>
              </div>`
            : null}
        </div>
      </div>
      <form @submit=${(event: Event) => this.handleCreate(event)}>
        <h3>Add a customer</h3>
        <label>
          <span>Name</span>
          <input name="name" required placeholder="Acme Studios" />
        </label>
        <label>
          <span>Email</span>
          <input type="email" name="email" placeholder="team@example.com" />
        </label>
        <label>
          <span>Phone</span>
          <input name="phone" placeholder="+1 555 123 4567" />
        </label>
        <label>
          <span>Address</span>
          <textarea name="address" placeholder="Street, City, ZIP"></textarea>
        </label>
        <button type="submit" ?disabled=${this.creating}>${this.creating ? 'Creating…' : 'Save customer'}</button>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'customers-page': CustomersPage;
  }
}
