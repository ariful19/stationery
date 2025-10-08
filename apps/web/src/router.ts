import { html, type TemplateResult } from 'lit';
import { ReactiveController, ReactiveControllerHost } from 'lit';
import './pages/dashboard-page.js';
import './pages/customers-page.js';
import './pages/products-page.js';
import './pages/invoice-editor-page.js';
import './pages/payments-page.js';
import './pages/reports-page.js';

export interface NavigationRoute {
  path: string;
  label: string;
  icon: string;
  description: string;
  render: (url: URL) => TemplateResult;
  match?: (url: URL) => boolean;
  exact?: boolean;
  includeInSidebar?: boolean;
}

export const navigationRoutes: NavigationRoute[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: '📊',
    description: 'Overview of dues, invoices, and activity',
    includeInSidebar: true,
    exact: true,
    render: () => html`<dashboard-page></dashboard-page>`,
  },
  {
    path: '/customers',
    label: 'Customers',
    icon: '👥',
    description: 'Manage customers and quick actions',
    includeInSidebar: true,
    render: () => html`<customers-page></customers-page>`,
  },
  {
    path: '/products',
    label: 'Products',
    icon: '📦',
    description: 'Browse and edit your catalog',
    includeInSidebar: true,
    render: () => html`<products-page></products-page>`,
  },
  {
    path: '/invoices/new',
    label: 'New Invoice',
    icon: '🧾',
    description: 'Create and send invoices',
    includeInSidebar: true,
    render: (url) =>
      html`<invoice-editor-page
        .prefillCustomerId=${Number(url.searchParams.get('customerId') ?? '')}
      ></invoice-editor-page>`,
  },
  {
    path: '/payments',
    label: 'Payments',
    icon: '💸',
    description: 'Record payments and update dues',
    includeInSidebar: true,
    render: (url) => {
      const customerParam = url.searchParams.get('customer');
      const parsed = customerParam ? Number(customerParam) : undefined;
      const customerId = parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
      return html`<payments-page .customer=${customerId}></payments-page>`;
    },
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: '📈',
    description: 'Dig into sales and dues trends',
    includeInSidebar: true,
    render: () => html`<reports-page></reports-page>`,
  },
  {
    path: '*',
    label: 'Not found',
    icon: '❓',
    description: 'The requested page could not be found',
    includeInSidebar: false,
    match: () => true,
    render: () =>
      html`<section class="empty-state">
        <h2>Page not found</h2>
        <p>Use the navigation to pick a section.</p>
      </section>`,
  },
];

const resolveRoute = (path: string) => {
  const url = new URL(path, window.location.origin);
  return (
    navigationRoutes.find((route) =>
      route.match
        ? route.match(url)
        : route.exact
          ? url.pathname === route.path
          : url.pathname.startsWith(route.path),
    ) ?? navigationRoutes[navigationRoutes.length - 1]
  );
};

export class AppRouter implements ReactiveController {
  private host: ReactiveControllerHost;
  private onChange?: (route: NavigationRoute, url: URL) => void;
  private _path = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  constructor(host: ReactiveControllerHost, onChange?: (route: NavigationRoute, url: URL) => void) {
    this.host = host;
    this.onChange = onChange;
    host.addController(this);
  }

  hostConnected() {
    window.addEventListener('popstate', this.handlePopstate);
    this.notify();
  }

  hostDisconnected() {
    window.removeEventListener('popstate', this.handlePopstate);
  }

  get currentPath() {
    return this._path;
  }

  navigate(path: string, options: { replace?: boolean } = {}) {
    const url = new URL(path, window.location.origin);
    const fullPath = `${url.pathname}${url.search}${url.hash}`;
    if (fullPath === this._path && !options.replace) {
      this.notify();
      return;
    }

    if (options.replace) {
      window.history.replaceState({}, '', fullPath);
    } else {
      window.history.pushState({}, '', fullPath);
    }

    this._path = fullPath;
    this.notify();
  }

  private handlePopstate = () => {
    this._path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    this.notify();
  };

  private notify() {
    const url = new URL(this._path, window.location.origin);
    const route = resolveRoute(this._path);
    this.onChange?.(route, url);
    this.host.requestUpdate();
  }

  render(): TemplateResult {
    const url = new URL(this._path, window.location.origin);
    const route = resolveRoute(this._path);
    return route.render(url);
  }
}

export const isRouteActive = (route: NavigationRoute, currentPath: string) => {
  const url = new URL(currentPath, window.location.origin);
  if (route.match && route.match(url)) return true;
  if (route.exact) {
    return url.pathname === route.path;
  }
  if (route.path === '*') return false;
  return url.pathname === route.path || url.pathname.startsWith(`${route.path}/`);
};
