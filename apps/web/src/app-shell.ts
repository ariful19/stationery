import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { animate } from 'motion';
import { AppRouter, isRouteActive, navigationRoutes, type NavigationRoute } from './router.js';

const prefersReducedMotion =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : ({ matches: false } as MediaQueryList);

@customElement('app-shell')
export class AppShell extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--color-bg);
      color: var(--color-text);
    }

    .layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 100vh;
      background: var(--color-bg);
    }

    .backdrop {
      display: none;
      grid-column: 1 / -1;
      grid-row: 1;
    }

    nav {
      grid-column: 1 / 2;
      grid-row: 1 / -1;
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-xl) var(--space-lg);
      background: linear-gradient(180deg, var(--color-surface), var(--color-surface-strong));
      border-right: 1px solid var(--color-border);
    }

    nav h1 {
      font-size: 1.25rem;
      margin: 0 0 var(--space-lg);
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: var(--space-xs);
    }

    nav button {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: var(--space-sm);
      width: 100%;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      padding: var(--space-sm) var(--space-md);
      background: transparent;
      text-align: left;
      font-size: 0.95rem;
      color: var(--color-text-subtle);
      transition:
        transform var(--transition-snappy),
        border-color var(--transition-snappy),
        background var(--transition-snappy),
        color var(--transition-snappy);
    }

    nav button span.icon {
      font-size: 1.15rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    nav button span.copy {
      display: flex;
      flex-direction: column;
      gap: var(--space-2xs);
    }

    nav button span.copy strong {
      font-size: 0.95rem;
      font-weight: 600;
      color: inherit;
    }

    nav button span.copy small {
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    nav button.active {
      background: rgba(37, 99, 235, 0.12);
      border-color: rgba(37, 99, 235, 0.35);
      color: var(--color-primary);
      box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.15);
    }

    nav button:hover:not(.active),
    nav button:focus-visible:not(.active) {
      border-color: rgba(37, 99, 235, 0.2);
      background: rgba(37, 99, 235, 0.08);
      color: var(--color-primary-strong);
    }

    main {
      grid-column: 2 / 3;
      grid-row: 1 / -1;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-lg) var(--space-2xl) var(--space-md);
      position: sticky;
      top: 0;
      background: rgba(245, 247, 251, 0.85);
      backdrop-filter: blur(18px);
      z-index: 10;
      border-bottom: 1px solid rgba(215, 222, 234, 0.6);
    }

    header h2 {
      margin: 0;
      font-size: 1.5rem;
      letter-spacing: -0.01em;
      color: var(--color-text);
    }

    header p {
      margin: var(--space-2xs) 0 0;
      color: var(--color-text-muted);
      font-size: 0.95rem;
    }

    .header-meta {
      display: flex;
      flex-direction: column;
    }

    .header-meta > div {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
    }

    .header-actions {
      display: flex;
      gap: var(--space-sm);
    }

    .header-actions button {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      padding: var(--space-sm) var(--space-lg);
      font-size: 0.9rem;
      color: var(--color-text);
      box-shadow: var(--shadow-sm);
    }

    .header-actions button.primary {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary-strong);
      box-shadow: 0 12px 30px rgba(37, 99, 235, 0.18);
    }

    .content {
      flex: 1;
      padding: 0 var(--space-2xl) var(--space-2xl);
      display: block;
    }

    .menu-toggle {
      display: none;
    }

    .content-inner {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: var(--space-2xl);
      box-shadow: var(--shadow-md);
      min-height: calc(100vh - 200px);
    }

    @media (max-width: 960px) {
      .layout {
        grid-template-columns: 1fr;
      }

      nav {
        grid-column: 1 / 2;
        grid-row: 1 / 2;
        position: fixed;
        inset: 0 auto 0 0;
        width: min(80vw, 320px);
        transform: translateX(-100%);
        transition: transform var(--transition-snappy);
        box-shadow: var(--shadow-lg);
        z-index: 20;
      }

      nav.open {
        transform: translateX(0);
      }

      .backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.35);
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--transition-snappy);
        z-index: 15;
      }

      .backdrop.visible {
        opacity: 1;
        pointer-events: auto;
      }

      main {
        grid-column: 1 / 2;
        grid-row: 2 / 3;
      }

      header {
        padding: var(--space-md) var(--space-xl);
      }

      .content {
        padding: 0 var(--space-lg) var(--space-xl);
      }

      .content-inner {
        padding: var(--space-xl);
        min-height: unset;
      }

      .menu-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        padding: var(--space-xs) var(--space-sm);
        margin-right: var(--space-sm);
      }
    }
  `;

  private router = new AppRouter(this, (route, url) => {
    this.currentPath = `${url.pathname}${url.search}${url.hash}`;
    document.title = `Stationery · ${route.label}`;
    const content = this.renderRoot?.querySelector('.content-inner');
    if (content instanceof HTMLElement && !prefersReducedMotion.matches) {
      animate(
        content,
        { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0)'] } as any,
        { duration: 0.18, easing: 'ease-out' } as any
      );
    }
  });

  @state()
  private currentPath =
    `${window.location.pathname}${window.location.search}${window.location.hash}`;

  @state()
  private sidebarOpen = false;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleKeydown);
  }

  disconnectedCallback(): void {
    window.removeEventListener('keydown', this.handleKeydown);
    super.disconnectedCallback();
  }

  private get currentRoute(): NavigationRoute {
    return (
      navigationRoutes.find((route) => isRouteActive(route, this.currentPath)) ??
      navigationRoutes[0]
    );
  }

  private handleNavClick(route: NavigationRoute) {
    this.router.navigate(route.path);
    this.sidebarOpen = false;
    queueMicrotask(() => {
      const main = this.renderRoot?.querySelector('main');
      (main as HTMLElement | null)?.focus();
    });
  }

  private toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  private handleBackdropClick = () => {
    this.sidebarOpen = false;
  };

  private handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.sidebarOpen) {
      this.sidebarOpen = false;
    }
  };

  private handleNavigate = (event: CustomEvent<string>) => {
    event.stopPropagation();
    if (event.detail) {
      this.router.navigate(event.detail);
    }
  };

  protected render() {
    const sidebarRoutes = navigationRoutes.filter((route) => route.includeInSidebar);
    const route = this.currentRoute;

    return html`
      <div class="layout">
        <div
          class="backdrop ${this.sidebarOpen ? 'visible' : ''}"
          @click=${this.handleBackdropClick}
        ></div>
        <nav class=${this.sidebarOpen ? 'open' : ''}>
          <h1>Stationery HQ</h1>
          <ul role="list">
            ${sidebarRoutes.map((nav) => {
              const active = isRouteActive(nav, this.currentPath);
              return html`
                <li>
                  <button
                    type="button"
                    class=${active ? 'active' : ''}
                    aria-current=${active ? 'page' : 'false'}
                    @click=${() => this.handleNavClick(nav)}
                  >
                    <span class="icon" aria-hidden="true">${nav.icon}</span>
                    <span class="copy">
                      <strong>${nav.label}</strong>
                      <small>${nav.description}</small>
                    </span>
                  </button>
                </li>
              `;
            })}
          </ul>
        </nav>
        <main tabindex="-1">
          <header>
            <div class="header-meta">
              <div>
                <button
                  class="menu-toggle"
                  @click=${this.toggleSidebar}
                  aria-label="Toggle navigation"
                >
                  ☰
                </button>
                <h2>${route.label}</h2>
              </div>
              <p>${route.description}</p>
            </div>
            <div class="header-actions">
              <button type="button" @click=${() => this.router.navigate('/invoices/new')}>
                New invoice
              </button>
              <button
                type="button"
                class="primary"
                @click=${() => this.router.navigate('/customers')}
              >
                Add customer
              </button>
            </div>
          </header>
          <section class="content">
            <div
              class="content-inner"
              role="region"
              aria-live="polite"
              @navigate=${this.handleNavigate}
            >
              ${this.router.render()}
            </div>
          </section>
        </main>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-shell': AppShell;
  }
}
