import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { requestInvoicePdf } from '../api/client.js';

@customElement('pdf-preview')
export class PdfPreview extends LitElement {
  static styles = css`
    :host {
      display: block;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-sm) var(--space-md);
      border-bottom: 1px solid var(--color-border);
      background: linear-gradient(180deg, rgba(37, 99, 235, 0.05), transparent);
    }

    header h4 {
      margin: 0;
      font-size: 0.95rem;
    }

    header button {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      padding: var(--space-xs) var(--space-sm);
      font-size: 0.85rem;
      color: var(--color-text);
    }

    .viewer {
      min-height: 320px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: repeating-linear-gradient(45deg, rgba(37, 99, 235, 0.05) 0, rgba(37, 99, 235, 0.05) 10px, transparent 10px, transparent 20px);
    }

    iframe,
    embed {
      width: 100%;
      min-height: 480px;
      border: none;
    }

    .message {
      padding: var(--space-lg);
      text-align: center;
      color: var(--color-text-muted);
      font-size: 0.9rem;
    }
  `;

  @property({ type: Number })
  invoiceId?: number;

  @property({ type: Boolean })
  auto = false;

  @state()
  private objectUrl?: string;

  @state()
  private loading = false;

  @state()
  private error?: string;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.revokeUrl();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('invoiceId') && this.auto && this.invoiceId) {
      this.load();
    }
  }

  private revokeUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }
  }

  private async load() {
    if (!this.invoiceId) return;
    this.loading = true;
    this.error = undefined;
    try {
      const blob = await requestInvoicePdf(this.invoiceId);
      this.revokeUrl();
      this.objectUrl = URL.createObjectURL(blob);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to load preview';
    } finally {
      this.loading = false;
    }
  }

  protected render() {
    return html`
      <header>
        <h4>Invoice preview</h4>
        <button type="button" @click=${this.load} ?disabled=${this.loading || !this.invoiceId}>
          ${this.loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>
      <div class="viewer" role="region" aria-live="polite">
        ${this.renderViewer()}
      </div>
    `;
  }

  private renderViewer() {
    if (this.loading) {
      return html`<div class="message">Preparing preview…</div>`;
    }

    if (this.error) {
      return html`<div class="message" role="alert">${this.error}</div>`;
    }

    if (!this.objectUrl) {
      return html`<div class="message">Generate an invoice to preview the PDF.</div>`;
    }

    return html`<embed src=${this.objectUrl} type="application/pdf" />`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pdf-preview': PdfPreview;
  }
}
