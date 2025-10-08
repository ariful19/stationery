import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import Chart from 'chart.js/auto';
import {
  fetchCustomers,
  fetchDuesReport,
  fetchSalesReport,
  type CustomerListResponse,
  type DuesReport,
  type SalesReport,
} from '../api/client.js';
import { formatCurrency, formatDate } from '../utils/format.js';

@customElement('dashboard-page')
export class DashboardPage extends LitElement {
  static styles = css`
    :host {
      display: grid;
      gap: var(--space-2xl);
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--space-lg);
    }

    .card {
      padding: var(--space-xl);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-md);
      border: 1px solid rgba(37, 99, 235, 0.12);
      display: grid;
      gap: var(--space-sm);
    }

    .card h3 {
      margin: 0;
      font-size: 0.9rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .card strong {
      font-size: 1.8rem;
      letter-spacing: -0.02em;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--space-2xl);
    }

    canvas {
      width: 100% !important;
      height: 320px !important;
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

    .loading {
      padding: var(--space-xl);
      text-align: center;
      color: var(--color-text-muted);
    }
  `;

  @state()
  private duesReport?: DuesReport;

  @state()
  private salesReport?: SalesReport;

  @state()
  private customerList?: CustomerListResponse;

  @state()
  private loading = false;

  private duesChart?: Chart;
  private salesChart?: Chart;

  connectedCallback(): void {
    super.connectedCallback();
    this.refresh();
  }

  disconnectedCallback(): void {
    this.duesChart?.destroy();
    this.salesChart?.destroy();
    super.disconnectedCallback();
  }

  private async refresh() {
    this.loading = true;
    try {
      const [dues, sales, customers] = await Promise.all([
        fetchDuesReport(),
        fetchSalesReport({ groupBy: 'month' }),
        fetchCustomers({ limit: 5, sort: 'createdAt' }),
      ]);
      this.duesReport = dues;
      this.salesReport = sales;
      this.customerList = customers;
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      this.loading = false;
      this.updateComplete.then(() => {
        this.renderCharts();
      });
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('duesReport') || changed.has('salesReport')) {
      this.renderCharts();
    }
  }

  private renderCharts() {
    const salesCanvas = this.renderRoot.querySelector<HTMLCanvasElement>('#sales-chart');
    if (salesCanvas && this.salesReport) {
      this.salesChart?.destroy();
      this.salesChart = new Chart(salesCanvas, {
        type: 'line',
        data: {
          labels: this.salesReport.rows.map((row) => row.period),
          datasets: [
            {
              label: 'Sales',
              data: this.salesReport.rows.map((row) => row.totalCents / 100),
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.25)',
              tension: 0.35,
              fill: true,
              pointRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              ticks: {
                callback: (value) => `$${value}`,
              },
            },
          },
        },
      });
    }

    const duesCanvas = this.renderRoot.querySelector<HTMLCanvasElement>('#dues-chart');
    if (duesCanvas && this.duesReport) {
      this.duesChart?.destroy();
      const top = [...this.duesReport.customers]
        .sort((a, b) => b.balanceCents - a.balanceCents)
        .slice(0, 6);
      this.duesChart = new Chart(duesCanvas, {
        type: 'doughnut',
        data: {
          labels: top.map((item) => item.customerName),
          datasets: [
            {
              label: 'Outstanding',
              data: top.map((item) => item.balanceCents / 100),
              backgroundColor: ['#2563eb', '#7c3aed', '#f97316', '#ef4444', '#10b981', '#0ea5e9'],
              borderWidth: 0,
            },
          ],
        },
        options: {
          plugins: {
            legend: { position: 'bottom' as const },
          },
        },
      });
    }
  }

  private get totalOutstanding() {
    if (!this.duesReport) return 0;
    return this.duesReport.customers.reduce((sum, item) => sum + item.balanceCents, 0);
  }

  private get totalInvoiced() {
    if (!this.duesReport) return 0;
    return this.duesReport.customers.reduce((sum, item) => sum + item.invoicedCents, 0);
  }

  private get totalPaid() {
    if (!this.duesReport) return 0;
    return this.duesReport.customers.reduce((sum, item) => sum + item.paidCents, 0);
  }

  private get latestCustomers() {
    return this.customerList?.data ?? [];
  }

  protected render() {
    if (this.loading && !this.duesReport) {
      return html`<div class="loading">Loading dashboard…</div>`;
    }

    return html`
      <section class="cards" aria-live="polite">
        <article class="card">
          <h3>Outstanding dues</h3>
          <strong>${formatCurrency(this.totalOutstanding)}</strong>
          <span>Across ${this.duesReport?.customers.length ?? 0} customers</span>
        </article>
        <article class="card">
          <h3>Total invoiced</h3>
          <strong>${formatCurrency(this.totalInvoiced)}</strong>
        </article>
        <article class="card">
          <h3>Total collected</h3>
          <strong>${formatCurrency(this.totalPaid)}</strong>
        </article>
      </section>

      <section class="grid">
        <article>
          <h3>Sales trend</h3>
          <canvas id="sales-chart" role="img" aria-label="Sales trend chart"></canvas>
        </article>
        <article>
          <h3>Top dues</h3>
          <canvas id="dues-chart" role="img" aria-label="Outstanding dues per customer"></canvas>
        </article>
      </section>

      <section>
        <h3>Recent customers</h3>
        ${this.latestCustomers.length
          ? html`<table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                ${this.latestCustomers.map(
                  (customer) =>
                    html`<tr>
                      <td>${customer.name}</td>
                      <td>${customer.email ?? '—'}</td>
                      <td>${formatDate(customer.createdAt, undefined, { dateStyle: 'medium' })}</td>
                    </tr>`,
                )}
              </tbody>
            </table>`
          : html`<div class="loading">
              No customers yet. Add your first customer to get started.
            </div>`}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dashboard-page': DashboardPage;
  }
}
