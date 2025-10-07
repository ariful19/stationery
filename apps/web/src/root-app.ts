import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { exampleCustomer } from '@stationery/shared';

@customElement('app-root')
export class AppRoot extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #d8eefe, #fef6e4);
      color: #1f2933;
      margin: 0;
    }

    main {
      padding: 2rem 3rem;
      border-radius: 1rem;
      background: white;
      box-shadow: 0 10px 40px rgba(15, 23, 42, 0.1);
      text-align: center;
      max-width: 480px;
    }

    h1 {
      font-size: 2.25rem;
      margin-bottom: 0.75rem;
    }

    p {
      margin: 0.5rem 0 0;
      font-size: 1.1rem;
    }
  `;

  @state()
  private message = `Hello, ${exampleCustomer.name}!`;

  protected render() {
    return html`
      <main>
        <h1>Stationery Web</h1>
        <p>${this.message}</p>
        <p>API proxy target: <code>/api</code></p>
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-root': AppRoot;
  }
}
