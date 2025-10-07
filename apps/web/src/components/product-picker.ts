import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Product } from '../api/client.js';
import { formatCurrency } from '../utils/format.js';

@customElement('product-picker')
export class ProductPicker extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: var(--space-2xs);
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }

    .input-wrapper {
      position: relative;
    }

    input[type='search'] {
      width: 100%;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      padding: calc(var(--space-sm) + 1px) var(--space-lg);
      font-size: 0.95rem;
      transition: border-color var(--transition-snappy), box-shadow var(--transition-snappy);
    }

    input[type='search']:focus-visible {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
      outline: none;
    }

    ul {
      margin: var(--space-xs) 0 0;
      padding: 0;
      list-style: none;
      max-height: 240px;
      overflow-y: auto;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    li + li {
      border-top: 1px solid rgba(215, 222, 234, 0.7);
    }

    button.option {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) var(--space-md);
      background: none;
      border: none;
      text-align: left;
      font-size: 0.9rem;
      color: var(--color-text);
    }

    button.option[aria-selected='true'] {
      background: rgba(37, 99, 235, 0.1);
      color: var(--color-primary);
    }

    .meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sku {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .empty-state {
      padding: var(--space-sm) var(--space-md);
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }
  `;

  @property({ attribute: false })
  products: Product[] = [];

  @property({ type: Number })
  value?: number;

  @property({ type: String })
  label = 'Product';

  @property({ type: Boolean })
  disabled = false;

  @state()
  private query = '';

  @state()
  private activeIndex = 0;

  get filteredProducts() {
    const search = this.query.trim().toLowerCase();
    if (!search) return this.products;
    return this.products.filter(product => {
      const haystack = `${product.sku} ${product.name}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  private selectProduct(product: Product) {
    this.value = product.id;
    this.query = `${product.sku} — ${product.name}`;
    this.activeIndex = this.filteredProducts.findIndex(item => item.id === product.id);
    this.dispatchEvent(
      new CustomEvent('product-select', {
        detail: { product },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.query = target.value;
    this.activeIndex = 0;
  };

  private handleFocus = (event: FocusEvent) => {
    const target = event.target as HTMLInputElement;
    if (!target.value && this.value) {
      const product = this.products.find(item => item.id === this.value);
      if (product) {
        this.query = `${product.sku} — ${product.name}`;
      }
    }
  };

  private handleKeydown = (event: KeyboardEvent) => {
    const products = this.filteredProducts;
    if (!products.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % products.length;
      this.scrollIntoView(this.activeIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex = (this.activeIndex - 1 + products.length) % products.length;
      this.scrollIntoView(this.activeIndex);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const product = products[this.activeIndex];
      if (product) {
        this.selectProduct(product);
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
    if (changed.has('value')) {
      const product = this.products.find(item => item.id === this.value);
      if (product) {
        this.query = `${product.sku} — ${product.name}`;
        const index = this.filteredProducts.findIndex(item => item.id === product.id);
        if (index >= 0) {
          this.activeIndex = index;
        }
      }
    }
  }

  protected render() {
    const products = this.filteredProducts;
    return html`
      <label>
        <span>${this.label}</span>
        <div class="input-wrapper">
          <input
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="product-list"
            aria-activedescendant=${products[this.activeIndex]?.id ?? ''}
            placeholder="Search products"
            ?disabled=${this.disabled}
            .value=${this.query}
            @input=${this.handleInput}
            @keydown=${this.handleKeydown}
            @focus=${this.handleFocus}
          />
        </div>
      </label>
      <ul id="product-list" role="listbox">
        ${products.length
          ? products.map((product, index) => {
              const selected = product.id === this.value;
              const active = index === this.activeIndex;
              return html`
                <li>
                  <button
                    type="button"
                    class="option"
                    role="option"
                    id=${String(product.id)}
                    aria-selected=${selected || active}
                    @click=${() => this.selectProduct(product)}
                  >
                    <span class="meta">
                      <strong>${product.name}</strong>
                      <span class="sku">${product.sku}</span>
                    </span>
                    <span>${formatCurrency(product.unitPriceCents)}</span>
                  </button>
                </li>
              `;
            })
          : html`<li class="empty-state" role="presentation">No products match “${this.query}”.</li>`}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'product-picker': ProductPicker;
  }
}
