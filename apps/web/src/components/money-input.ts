import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { centsToNumber, formatCurrency, numberToCents } from '../utils/format.js';

@customElement('money-input')
export class MoneyInput extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      flex-direction: column;
      gap: var(--space-2xs);
      font-size: 0.9rem;
    }

    label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
      color: var(--color-text-muted);
      font-weight: 500;
    }

    .field {
      position: relative;
    }

    input {
      width: 100%;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      padding: calc(var(--space-sm) + 1px) calc(var(--space-lg) + 0.5rem);
      font-size: 1rem;
      color: var(--color-text);
      transition:
        border-color var(--transition-snappy),
        box-shadow var(--transition-snappy);
    }

    input:focus-visible {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
      outline: none;
    }

    .currency {
      position: absolute;
      inset: 0 auto 0 var(--space-sm);
      display: inline-flex;
      align-items: center;
      font-weight: 600;
      color: var(--color-text-muted);
      pointer-events: none;
    }

    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      appearance: none;
      margin: 0;
    }
  `;

  @property({ type: Number })
  value = 0;

  @property({ type: String })
  currency = 'USD';

  @property({ type: String })
  locale = navigator.language || 'en-US';

  @property({ type: String })
  label = 'Amount';

  @property({ type: String })
  name?: string;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  readonly = false;

  @property({ type: Boolean, reflect: true })
  required = false;

  @property({ type: String })
  placeholder = '0.00';

  @query('input')
  private inputElement!: HTMLInputElement;

  private format(value: number) {
    return formatCurrency(value, this.currency, this.locale);
  }

  private updateDisplayValue() {
    const input = this.inputElement;
    if (!input) return;
    input.value = centsToNumber(this.value).toFixed(2);
  }

  private handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const clean = target.value.replace(/[^0-9.,-]/g, '');
    const normalized = clean.replace(/,/g, '.');
    const parsed = Number.parseFloat(normalized);
    const cents = numberToCents(Number.isNaN(parsed) ? 0 : parsed);
    this.value = cents;
    this.dispatchEvent(
      new CustomEvent('value-change', {
        detail: { value: cents },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private handleBlur = () => {
    this.updateDisplayValue();
  };

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('value')) {
      this.updateDisplayValue();
    }
  }

  protected firstUpdated(): void {
    this.updateDisplayValue();
  }

  protected render() {
    return html`
      <label>
        <span>${this.label}</span>
        <span aria-hidden="true">${this.format(this.value)}</span>
      </label>
      <div class="field">
        <span class="currency" aria-hidden="true">${this.currency}</span>
        <input
          type="text"
          inputmode="decimal"
          autocomplete="off"
          .name=${this.name ?? ''}
          .value=${centsToNumber(this.value).toFixed(2)}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          @input=${this.handleInput}
          @blur=${this.handleBlur}
        />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'money-input': MoneyInput;
  }
}
