import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  createProduct,
  fetchProducts,
  type Product,
  type ProductCreateInput,
  type ProductListResponse
} from '../api/client.js';
import { formatCurrency, formatDate } from '../utils/format.js';

@customElement('products-page')
export class ProductsPage extends LitElement {
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
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-border);
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

    @media (max-width: 980px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
  `;

  @state()
  private products: Product[] = [];

  @state()
  private pagination?: ProductListResponse['pagination'];

  @state()
  private creating = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.load();
  }

  private async load() {
    try {
      const response = await fetchProducts({ limit: 50, sort: 'createdAt' });
      this.products = response.data;
      this.pagination = response.pagination;
    } catch (error) {
      console.error('Failed to load products', error);
    }
  }

  private async handleCreate(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const price = Number.parseInt(String(formData.get('unitPriceCents') ?? '0'), 10);
    const stock = Number.parseInt(String(formData.get('stockQty') ?? '0'), 10);

    const payload: ProductCreateInput = {
      sku: String(formData.get('sku') ?? '').trim(),
      name: String(formData.get('name') ?? '').trim(),
      description: (formData.get('description') as string | null)?.trim() || undefined,
      unitPriceCents: Number.isNaN(price) ? 0 : price,
      stockQty: Number.isNaN(stock) ? 0 : Math.max(0, stock)
    };

    if (!payload.sku || !payload.name) return;

    this.creating = true;
    const optimistic: Product = {
      id: Date.now() * -1,
      ...payload,
      createdAt: new Date().toISOString()
    };
    this.products = [optimistic, ...this.products];
    form.reset();

    try {
      const created = await createProduct(payload);
      this.products = [created, ...this.products.filter(product => product.id !== optimistic.id)];
    } catch (error) {
      console.error('Failed to create product', error);
      this.products = this.products.filter(product => product.id !== optimistic.id);
    } finally {
      this.creating = false;
    }
  }

  protected render() {
    return html`
      <div class="layout">
        <form @submit=${(event: Event) => this.handleCreate(event)}>
          <h3>Add product</h3>
          <label>
            <span>SKU</span>
            <input name="sku" required placeholder="PAPER-A4-80" />
          </label>
          <label>
            <span>Name</span>
            <input name="name" required placeholder="A4 Copy Paper" />
          </label>
          <label>
            <span>Description</span>
            <textarea name="description" placeholder="Details visible in the catalog"></textarea>
          </label>
          <label>
            <span>Unit price (cents)</span>
            <input name="unitPriceCents" type="number" min="0" step="1" required />
          </label>
          <label>
            <span>Stock quantity</span>
            <input name="stockQty" type="number" min="0" step="1" required />
          </label>
          <button type="submit" ?disabled=${this.creating}>${this.creating ? 'Saving…' : 'Save product'}</button>
        </form>
        <div>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${this.products.map(
                product => html`<tr>
                  <td>${product.sku}</td>
                  <td>${product.name}</td>
                  <td>${formatCurrency(product.unitPriceCents)}</td>
                  <td>${product.stockQty}</td>
                  <td>${formatDate(product.createdAt, undefined, { dateStyle: 'medium' })}</td>
                </tr>`
              )}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'products-page': ProductsPage;
  }
}
