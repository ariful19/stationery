import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import Chart from 'chart.js/auto';
import {
  fetchDuesReport,
  fetchSalesReport,
  type DuesReport,
  type SalesReport,
  type SalesReportQuery
} from '../api/client.js';
import { formatCurrency } from '../utils/format.js';

@customElement('reports-page')
export class ReportsPage extends LitElement {
  static styles = css`
    :host {
      display: grid;
      gap: var(--space-xl);
    }

    form {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
      align-items: flex-end;
      background: var(--color-surface);
      padding: var(--space-lg);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }

    label {
      display: grid;
      gap: var(--space-2xs);
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }

    input,
    select {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      padding: var(--space-sm) var(--space-md);
      font-size: 0.95rem;
    }

    button {
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-primary);
      background: var(--color-primary);
      color: white;
      padding: var(--space-sm) var(--space-lg);
      font-size: 0.95rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: var(--space-xl);
    }

    canvas {
      width: 100% !important;
      height: 360px !important;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
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
  `;

  @state()
  private duesReport?: DuesReport;

  @state()
  private salesReport?: SalesReport;

  @state()
  private filters: SalesReportQuery = { groupBy: 'month' };

  private salesChart?: Chart;
  private duesChart?: Chart;

  connectedCallback(): void {
    super.connectedCallback();
    this.refresh();
  }

  disconnectedCallback(): void {
    this.salesChart?.destroy();
    this.duesChart?.destroy();
    super.disconnectedCallback();
  }

  private async refresh() {
    try {
      const [dues, sales] = await Promise.all([
        fetchDuesReport(),
        fetchSalesReport({
          from: this.filters.from,
          to: this.filters.to,
          groupBy: this.filters.groupBy
        })
      ]);
      this.duesReport = dues;
      this.salesReport = sales;
      await this.updateComplete;
      this.renderCharts();
    } catch (error) {
      console.error('Failed to load reports', error);
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('duesReport') || changed.has('salesReport')) {
      this.renderCharts();
    }
  }

  private renderCharts() {
    const salesCanvas = this.renderRoot.querySelector<HTMLCanvasElement>('#sales-report');
    if (salesCanvas && this.salesReport) {
      this.salesChart?.destroy();
      this.salesChart = new Chart(salesCanvas, {
        type: 'bar',
        data: {
          labels: this.salesReport.rows.map(row => row.period),
          datasets: [
            {
              label: 'Sales',
              data: this.salesReport.rows.map(row => row.totalCents / 100),
              backgroundColor: '#2563eb'
            }
          ]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: {
              ticks: {
                callback: value => `$${value}`
              }
            }
          }
        }
      });
    }

    const duesCanvas = this.renderRoot.querySelector<HTMLCanvasElement>('#dues-report');
    if (duesCanvas && this.duesReport) {
      this.duesChart?.destroy();
      const sorted = [...this.duesReport.customers].sort((a, b) => b.balanceCents - a.balanceCents);
      this.duesChart = new Chart(duesCanvas, {
        type: 'bar',
        data: {
          labels: sorted.map(item => item.customerName),
          datasets: [
            {
              label: 'Outstanding balance',
              data: sorted.map(item => item.balanceCents / 100),
              backgroundColor: '#f97316'
            }
          ]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: {
              ticks: {
                callback: value => `$${value}`
              }
            }
          }
        }
      });
    }
  }

  private async handleFilter(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    this.filters = {
      from: ((formData.get('from') as string) || undefined) as SalesReportQuery['from'],
      to: ((formData.get('to') as string) || undefined) as SalesReportQuery['to'],
      groupBy: (formData.get('groupBy') as SalesReportQuery['groupBy']) ?? 'month'
    };
    await this.refresh();
  }

  protected render() {
    return html`
      <form @submit=${(event: Event) => this.handleFilter(event)}>
        <label>
          <span>From</span>
          <input type="date" name="from" .value=${this.filters.from ?? ''} />
        </label>
        <label>
          <span>To</span>
          <input type="date" name="to" .value=${this.filters.to ?? ''} />
        </label>
        <label>
          <span>Group by</span>
          <select name="groupBy" .value=${this.filters.groupBy}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
        <button type="submit">Update</button>
      </form>

      <section class="grid">
        <article>
          <h3>Sales</h3>
          <canvas id="sales-report"></canvas>
          ${this.salesReport
            ? html`<table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Invoices</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.salesReport.rows.map(
                    row => html`<tr>
                      <td>${row.period}</td>
                      <td>${row.invoicesCount}</td>
                      <td>${formatCurrency(row.totalCents)}</td>
                    </tr>`
                  )}
                </tbody>
              </table>`
            : null}
        </article>
        <article>
          <h3>Dues by customer</h3>
          <canvas id="dues-report"></canvas>
          ${this.duesReport
            ? html`<table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Invoiced</th>
                    <th>Paid</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.duesReport.customers.map(
                    customer => html`<tr>
                      <td>${customer.customerName}</td>
                      <td>${formatCurrency(customer.invoicedCents)}</td>
                      <td>${formatCurrency(customer.paidCents)}</td>
                      <td>${formatCurrency(customer.balanceCents)}</td>
                    </tr>`
                  )}
                </tbody>
              </table>`
            : null}
        </article>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'reports-page': ReportsPage;
  }
}
