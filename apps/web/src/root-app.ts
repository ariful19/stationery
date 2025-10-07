import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import './app-shell.js';

@customElement('app-root')
export class AppRoot extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--color-bg);
      color: var(--color-text);
    }
  `;

  protected render() {
    return html`<app-shell></app-shell>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-root': AppRoot;
  }
}
