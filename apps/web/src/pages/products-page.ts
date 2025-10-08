import { css, html, LitElement } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';

import {
  createProduct,
  fetchProducts,
  type Product,
  type ProductCreateInput,
  type ProductListResponse,
  type ProductUpdateInput,
  updateProduct,
} from '../api/client.js';
import { formatCurrency, formatDate } from '../utils/format.js';

type ProductFormState = {
  sku: string;
  name: string;
  description: string;
  unitPriceCents: string;
  stockQty: string;
};

@customElement('products-page')
export class ProductsPage extends LitElement {
  static styles = css`
    :host {
      display: grid;
      gap: var(--space-xl);
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: var(--space-lg);
    }

    header h2 {
      margin: 0;
      font-size: 1.6rem;
      letter-spacing: -0.01em;
    }

    header p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: 0.95rem;
    }

    .summary {
      display: flex;
      gap: var(--space-sm);
      align-items: center;
      background: var(--color-surface);
      border-radius: var(--radius-full);
      padding: var(--space-xs) var(--space-md);
      border: 1px solid var(--color-border);
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(320px, 380px) 1fr;
      gap: var(--space-xl);
      align-items: start;
    }

    .panel {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--color-border);
    }

    form {
      display: grid;
      gap: var(--space-md);
      padding: var(--space-xl);
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-sm);
    }

    .form-header h3 {
      margin: 0;
      font-size: 1.1rem;
      letter-spacing: -0.01em;
    }

    .form-header button {
      border-radius: var(--radius-full);
      padding: var(--space-xs) var(--space-sm);
      font-size: 0.8rem;
      background: transparent;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
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
      background: var(--color-surface-strong);
    }

    input:focus,
    textarea:focus {
      outline: 2px solid var(--color-primary-soft);
      border-color: var(--color-primary);
    }

    textarea {
      min-height: 88px;
      resize: vertical;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-sm);
      align-items: center;
    }

    .actions button[type='submit'] {
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: white;
      border: 1px solid var(--color-primary-strong);
      padding: var(--space-sm) var(--space-lg);
      font-size: 0.95rem;
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.18);
    }

    .actions button[type='button'] {
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-muted);
      border: 1px solid var(--color-border);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.9rem;
    }

    .table-card {
      display: grid;
      gap: var(--space-md);
      padding: var(--space-xl);
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-lg);
    }

    .table-header h3 {
      margin: 0;
      font-size: 1.15rem;
      letter-spacing: -0.01em;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    th,
    td {
      padding: var(--space-sm) var(--space-lg);
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.9rem;
    }

    th {
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      background: var(--color-surface-strong);
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    tbody tr:hover td {
      background: rgba(37, 99, 235, 0.05);
    }

    .actions-cell button {
      border: none;
      background: none;
      color: var(--color-primary);
      font-weight: 600;
      cursor: pointer;
      padding: var(--space-3xs) var(--space-xs);
    }

    .empty {
      padding: var(--space-lg) var(--space-md);
      text-align: center;
      color: var(--color-text-muted);
      font-size: 0.95rem;
    }

    @media (max-width: 980px) {
      header {
        flex-direction: column;
        align-items: flex-start;
      }

      .layout {
        grid-template-columns: 1fr;
      }

      table {
        font-size: 0.85rem;
      }
    }
  `;

  @state()
  private products: Product[] = [];

  @state()
  private pagination?: ProductListResponse['pagination'];

  @state()
  private saving = false;

  @state()
  private formData: ProductFormState = this.createFormState();

  @state()
  private editingProduct?: Product;

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

  private createFormState(product?: Product): ProductFormState {
    return {
      sku: product?.sku ?? '',
      name: product?.name ?? '',
      description: product?.description ?? '',
      unitPriceCents: product ? String(product.unitPriceCents) : '',
      stockQty: product ? String(product.stockQty) : '',
    };
  }

  private resetForm(product?: Product) {
    this.formData = this.createFormState(product);
  }

  private handleInput(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const name = target.name as keyof ProductFormState;
    const value = target.value;
    this.formData = { ...this.formData, [name]: value };
  }

  private startEdit(product: Product) {
    this.editingProduct = product;
    this.resetForm(product);
  }

  private cancelEdit() {
    this.editingProduct = undefined;
    this.resetForm();
  }

  private parsePayload(): ProductCreateInput {
    const price = Number.parseInt(this.formData.unitPriceCents.trim() || '0', 10);
    const stock = Number.parseInt(this.formData.stockQty.trim() || '0', 10);

    return {
      sku: this.formData.sku.trim(),
      name: this.formData.name.trim(),
      description: this.formData.description.trim() || undefined,
      unitPriceCents: Number.isNaN(price) ? 0 : Math.max(0, price),
      stockQty: Number.isNaN(stock) ? 0 : Math.max(0, stock),
    } satisfies ProductCreateInput;
  }

  private async handleSubmit(event: Event) {
    event.preventDefault();
    const payload = this.parsePayload();

    if (!payload.sku || !payload.name) {
      return;
    }

    this.saving = true;

    if (!this.editingProduct) {
      const optimistic: Product = {
        id: Date.now() * -1,
        ...payload,
        createdAt: new Date().toISOString(),
      };

      this.products = [optimistic, ...this.products];
      this.resetForm();

      try {
        const created = await createProduct(payload);
        this.products = [
          created,
          ...this.products.filter((product) => product.id !== optimistic.id),
        ];
        if (this.pagination) {
          this.pagination = {
            ...this.pagination,
            total: this.pagination.total + 1,
          };
        }
      } catch (error) {
        console.error('Failed to create product', error);
        this.products = this.products.filter((product) => product.id !== optimistic.id);
      } finally {
        this.saving = false;
      }
      return;
    }

    try {
      const updatePayload: ProductUpdateInput = { ...payload };
      const updated = await updateProduct(this.editingProduct.id, updatePayload);
      this.products = this.products.map((product) =>
        product.id === updated.id ? updated : product,
      );
      this.editingProduct = undefined;
      this.resetForm();
    } catch (error) {
      console.error('Failed to update product', error);
    } finally {
      this.saving = false;
    }
  }

  protected render() {
    return html`
      <header>
        <div>
          <h2>Products</h2>
          <p>Keep your catalog tidy and up to date with quick edits.</p>
        </div>
        <div class="summary">
          <span>${this.products.length} items</span>
          ${this.pagination ? html`<span>• Showing up to ${this.pagination.limit}</span>` : null}
        </div>
      </header>
      <div class="layout">
        <section class="panel">
          <form @submit=${(event: Event) => this.handleSubmit(event)}>
            <div class="form-header">
              <h3>${this.editingProduct ? 'Edit product' : 'Add product'}</h3>
              ${this.editingProduct
                ? html`<button type="button" @click=${() => this.cancelEdit()}>Cancel</button>`
                : null}
            </div>
            <label>
              <span>SKU</span>
              <input
                name="sku"
                required
                placeholder="PAPER-A4-80"
                .value=${live(this.formData.sku)}
                @input=${this.handleInput}
              />
            </label>
            <label>
              <span>Name</span>
              <input
                name="name"
                required
                placeholder="A4 Copy Paper"
                .value=${live(this.formData.name)}
                @input=${this.handleInput}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                name="description"
                placeholder="Details visible in the catalog"
                .value=${live(this.formData.description)}
                @input=${this.handleInput}
              ></textarea>
            </label>
            <label>
              <span>Unit price (cents)</span>
              <input
                name="unitPriceCents"
                type="number"
                min="0"
                step="1"
                required
                inputmode="numeric"
                .value=${live(this.formData.unitPriceCents)}
                @input=${this.handleInput}
              />
            </label>
            <label>
              <span>Stock quantity</span>
              <input
                name="stockQty"
                type="number"
                min="0"
                step="1"
                required
                inputmode="numeric"
                .value=${live(this.formData.stockQty)}
                @input=${this.handleInput}
              />
            </label>
            <div class="actions">
              ${this.editingProduct
                ? html`<button
                    type="button"
                    @click=${() => this.editingProduct && this.resetForm(this.editingProduct)}
                  >
                    Reset
                  </button>`
                : null}
              <button type="submit" ?disabled=${this.saving}>
                ${this.saving ? 'Saving…' : this.editingProduct ? 'Update product' : 'Save product'}
              </button>
            </div>
          </form>
        </section>
        <section class="panel table-card">
          <div class="table-header">
            <h3>Catalog</h3>
            <span class="summary">${this.pagination?.total ?? this.products.length} total</span>
          </div>
          ${this.products.length === 0
            ? html`<div class="empty">No products yet. Add your first item to get started.</div>`
            : html`
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.products.map(
                      (product) => html`
                        <tr>
                          <td>${product.sku}</td>
                          <td>${product.name}</td>
                          <td>${formatCurrency(product.unitPriceCents)}</td>
                          <td>${product.stockQty}</td>
                          <td>
                            ${formatDate(product.createdAt, undefined, { dateStyle: 'medium' })}
                          </td>
                          <td class="actions-cell">
                            <button type="button" @click=${() => this.startEdit(product)}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
              `}
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'products-page': ProductsPage;
  }
}
