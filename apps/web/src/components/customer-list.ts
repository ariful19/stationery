import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Customer } from '../api/client.js';
import { formatDate, formatRelativeDate } from '../utils/format.js';

@customElement('customer-list')
export class CustomerList extends LitElement {
  static styles = css`
    :host {
      display: block;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(180deg, rgba(37, 99, 235, 0.07), transparent);
    }

    header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
    }

    header span {
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }

    input[type='search'] {
      width: 100%;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.9rem;
    }

    input[type='search']:focus-visible {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
      outline: none;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 420px;
      overflow-y: auto;
    }

    li + li {
      border-top: 1px solid rgba(215, 222, 234, 0.6);
    }

    button.customer {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--space-sm);
      width: 100%;
      text-align: left;
      border: none;
      background: none;
      padding: var(--space-md) var(--space-lg);
      font-size: 0.9rem;
      color: var(--color-text);
    }

    button.customer.is-active {
      background: rgba(37, 99, 235, 0.12);
      color: var(--color-primary);
    }

    .details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .details strong {
      font-size: 1rem;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs) var(--space-sm);
      color: var(--color-text-muted);
      font-size: 0.75rem;
    }

    .empty {
      padding: var(--space-lg);
      text-align: center;
      color: var(--color-text-muted);
    }
  `;

  @property({ attribute: false })
  customers: Customer[] = [];

  @property({ type: Number })
  selectedId?: number;

  @property({ type: Boolean })
  loading = false;

  @state()
  private query = '';

  @state()
  private activeIndex = 0;

  get filteredCustomers() {
    const term = this.query.trim().toLowerCase();
    if (!term) return this.customers;
    return this.customers.filter(customer =>
      `${customer.name} ${customer.email ?? ''} ${customer.phone ?? ''}`.toLowerCase().includes(term)
    );
  }

  private handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.query = target.value;
    this.activeIndex = 0;
  };

  private selectCustomer(customer: Customer) {
    this.selectedId = customer.id;
    this.dispatchEvent(
      new CustomEvent('customer-selected', {
        detail: { customer },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleListKeydown = (event: KeyboardEvent) => {
    const customers = this.filteredCustomers;
    if (!customers.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % customers.length;
      this.selectedId = customers[this.activeIndex].id;
      this.scrollIntoView(this.activeIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex = (this.activeIndex - 1 + customers.length) % customers.length;
      this.selectedId = customers[this.activeIndex].id;
      this.scrollIntoView(this.activeIndex);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const customer = customers[this.activeIndex];
      if (customer) {
        this.selectCustomer(customer);
      }
    }
  };

  private scrollIntoView(index: number) {
    const list = this.renderRoot.querySelector('ul');
    const item = list?.children[index] as HTMLElement | undefined;
    if (list && item) {
      const itemTop = item.offsetTop;
      const itemBottom = itemTop + item.offsetHeight;
      if (itemTop < list.scrollTop) {
        list.scrollTop = itemTop;
      } else if (itemBottom > list.scrollTop + list.clientHeight) {
        list.scrollTop = itemBottom - list.clientHeight;
      }
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('customers') || changed.has('selectedId')) {
      const index = this.filteredCustomers.findIndex(customer => customer.id === this.selectedId);
      this.activeIndex = index >= 0 ? index : 0;
    }
  }

  protected render() {
    const customers = this.filteredCustomers;
    return html`
      <header>
        <div>
          <h3>Customers</h3>
          <span>${this.loading ? 'Loading…' : `${customers.length} matches`}</span>
        </div>
        <input
          type="search"
          placeholder="Search name, email, phone"
          aria-label="Search customers"
          .value=${this.query}
          @input=${this.handleInput}
        />
      </header>
      ${customers.length
        ? html`<ul role="listbox" tabindex="0" @keydown=${this.handleListKeydown}>
            ${customers.map((customer, index) => {
              const selected = this.selectedId === customer.id;
              const active = index === this.activeIndex;
              return html`
                <li>
                  <button
                    type="button"
                    class=${`customer ${selected || active ? 'is-active' : ''}`}
                    role="option"
                    aria-selected=${selected || active}
                    @click=${() => this.selectCustomer(customer)}
                  >
                    <span class="details">
                      <strong>${customer.name}</strong>
                      <span class="meta">
                        ${customer.email ? html`<span>${customer.email}</span>` : null}
                        ${customer.phone ? html`<span>${customer.phone}</span>` : null}
                        <span>Joined ${formatRelativeDate(customer.createdAt)}</span>
                      </span>
                    </span>
                    <span class="meta">
                      <span>${formatDate(customer.createdAt)}</span>
                    </span>
                  </button>
                </li>
              `;
            })}
          </ul>`
        : html`<div class="empty" role="status">No customers found.</div>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'customer-list': CustomerList;
  }
}
