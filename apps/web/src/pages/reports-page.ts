import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import Chart from 'chart.js/auto';
import {
  downloadDuesReportCsv,
  downloadDuesReportPdf,
  downloadPaymentsLedgerCsv,
  downloadPaymentsLedgerPdf,
  downloadSalesReportCsv,
  downloadSalesReportPdf,
  fetchCustomers,
  fetchDuesReport,
  fetchPaymentsLedger,
  fetchSalesReport,
  type Customer,
  type DuesReport,
  type DuesReportQuery,
  type PaymentsLedger,
  type PaymentsLedgerQuery,
  type SalesReport,
  type SalesReportQuery,
} from '../api/client.js';
import { formatCurrency } from '../utils/format.js';

@customElement('reports-page')
export class ReportsPage extends LitElement {
  static styles = css`
    :host {
      display: grid;
      gap: var(--space-xl);
    }

    .summary {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-xl);
      box-shadow: var(--shadow-sm);
    }

    .summary ul {
      margin: var(--space-md) 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: var(--space-xs);
    }

    .summary strong {
      color: var(--color-primary);
    }

    form.filter {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-sm);
      align-items: flex-end;
      background: var(--color-surface);
      padding: var(--space-lg);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      margin-bottom: var(--space-lg);
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
      cursor: pointer;
    }

    .downloads button {
      background: transparent;
      color: var(--color-primary);
      border-color: var(--color-primary);
      padding: var(--space-xs) var(--space-md);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: var(--space-xl);
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

    tfoot td {
      font-weight: 600;
      background: rgba(37, 99, 235, 0.06);
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
  private paymentsLedger?: PaymentsLedger;

  @state()
  private salesFilters: SalesReportQuery = { groupBy: 'month' };

  @state()
  private duesFilters: DuesReportQuery = {};

  @state()
  private ledgerFilters: PaymentsLedgerQuery = { direction: 'asc' };

  @state()
  private customers: Customer[] = [];

  private salesChart?: Chart;
  private duesChart?: Chart;
  private paymentsChart?: Chart;

  connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  disconnectedCallback(): void {
    this.salesChart?.destroy();
    this.duesChart?.destroy();
    this.paymentsChart?.destroy();
    super.disconnectedCallback();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('duesReport') || changed.has('salesReport') || changed.has('paymentsLedger')) {
      this.renderCharts();
    }
  }

  private async load() {
    try {
      const [customerResponse, dues, sales, ledger] = await Promise.all([
        fetchCustomers({ limit: 100, sort: 'name', direction: 'asc' }),
        fetchDuesReport(this.duesFilters),
        fetchSalesReport(this.salesFilters),
        fetchPaymentsLedger(this.ledgerFilters),
      ]);
      this.customers = customerResponse.data;
      this.duesReport = dues;
      this.salesReport = sales;
      this.paymentsLedger = ledger;
    } catch (error) {
      console.error('Failed to load reports', error);
    }
  }

  private async refreshReports() {
    try {
      const [dues, sales, ledger] = await Promise.all([
        fetchDuesReport(this.duesFilters),
        fetchSalesReport(this.salesFilters),
        fetchPaymentsLedger(this.ledgerFilters),
      ]);
      this.duesReport = dues;
      this.salesReport = sales;
      this.paymentsLedger = ledger;
    } catch (error) {
      console.error('Failed to refresh reports', error);
    }
  }

  private renderCharts() {
    const salesCanvas = this.renderRoot.querySelector<HTMLCanvasElement>('#sales-report');
    if (salesCanvas && this.salesReport) {
      this.salesChart?.destroy();
      this.salesChart = new Chart(salesCanvas, {
        type: 'bar',
        data: {
          labels: this.salesReport.rows.map((row) => row.period),
          datasets: [
            {
              label: 'Sales',
              data: this.salesReport.rows.map((row) => row.totalCents / 100),
              backgroundColor: '#2563eb',
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
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

    const duesCanvas = this.renderRoot.querySelector<HTMLCanvasElement>('#dues-report');
    if (duesCanvas && this.duesReport) {
      this.duesChart?.destroy();
      const sorted = [...this.duesReport.customers].sort((a, b) => b.balanceCents - a.balanceCents);
      this.duesChart = new Chart(duesCanvas, {
        type: 'bar',
        data: {
          labels: sorted.map((item) => item.customerName),
          datasets: [
            {
              label: 'Outstanding balance',
              data: sorted.map((item) => item.balanceCents / 100),
              backgroundColor: '#f97316',
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
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

    const paymentsCanvas = this.renderRoot.querySelector<HTMLCanvasElement>('#payments-report');
    if (paymentsCanvas && this.paymentsLedger) {
      this.paymentsChart?.destroy();
      const chronological = [...this.paymentsLedger.entries].sort(
        (a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime(),
      );
      this.paymentsChart = new Chart(paymentsCanvas, {
        type: 'line',
        data: {
          labels: chronological.map((entry) => new Date(entry.paidAt).toLocaleDateString()),
          datasets: [
            {
              label: 'Running total',
              data: chronological.map((entry) => entry.runningBalanceCents / 100),
              borderColor: '#16a34a',
              backgroundColor: 'rgba(22, 163, 74, 0.15)',
              fill: true,
              tension: 0.2,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
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
  }

  private async handleSalesFilter(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    this.salesFilters = {
      from: ((formData.get('from') as string) || undefined) as SalesReportQuery['from'],
      to: ((formData.get('to') as string) || undefined) as SalesReportQuery['to'],
      groupBy: (formData.get('groupBy') as SalesReportQuery['groupBy']) ?? 'month',
    };
    await this.refreshReports();
  }

  private async handleDuesFilter(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const minBalanceInput = formData.get('minBalance') as string | null;
    this.duesFilters = {
      customerId: formData.get('customerId') ? Number(formData.get('customerId')) : undefined,
      search: ((formData.get('search') as string) || undefined) as DuesReportQuery['search'],
      minBalanceCents:
        minBalanceInput && minBalanceInput.length > 0
          ? Math.round(Number(minBalanceInput) * 100)
          : undefined,
    };
    await this.refreshReports();
  }

  private async handleLedgerFilter(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    this.ledgerFilters = {
      from: ((formData.get('from') as string) || undefined) as PaymentsLedgerQuery['from'],
      to: ((formData.get('to') as string) || undefined) as PaymentsLedgerQuery['to'],
      customerId: formData.get('customerId') ? Number(formData.get('customerId')) : undefined,
      direction: (formData.get('direction') as PaymentsLedgerQuery['direction']) ?? 'asc',
    };
    await this.refreshReports();
  }

  private async handleDownload(target: 'dues' | 'sales' | 'payments', format: 'csv' | 'pdf') {
    try {
      let blob: Blob;
      if (target === 'dues') {
        blob =
          format === 'csv'
            ? await downloadDuesReportCsv(this.duesFilters)
            : await downloadDuesReportPdf(this.duesFilters);
      } else if (target === 'sales') {
        blob =
          format === 'csv'
            ? await downloadSalesReportCsv(this.salesFilters)
            : await downloadSalesReportPdf(this.salesFilters);
      } else {
        blob =
          format === 'csv'
            ? await downloadPaymentsLedgerCsv(this.ledgerFilters)
            : await downloadPaymentsLedgerPdf(this.ledgerFilters);
      }

      const filename = `${target}-report.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report', error);
    }
  }

  protected render() {
    const outstanding = this.duesReport?.summary.totalBalanceCents ?? 0;
    const invoiced = this.duesReport?.summary.totalInvoicedCents ?? 0;
    const paid = this.paymentsLedger?.summary.totalPaidCents ?? 0;
    const delta = invoiced - paid;

    return html`
      <section class="summary">
        <h3>Cross-check totals</h3>
        <p>
          Outstanding balances should equal invoiced amounts minus recorded payments. Current delta:
          <strong>${formatCurrency(delta)}</strong>.
        </p>
        <ul>
          <li>Invoiced to date: <strong>${formatCurrency(invoiced)}</strong></li>
          <li>Total payments: <strong>${formatCurrency(paid)}</strong></li>
          <li>Outstanding ledger balance: <strong>${formatCurrency(outstanding)}</strong></li>
        </ul>
      </section>

      <section class="grid">
        <article>
          <h3>Sales</h3>
          <form class="filter" @submit=${(event: Event) => this.handleSalesFilter(event)}>
            <label>
              <span>From</span>
              <input type="date" name="from" .value=${this.salesFilters.from ?? ''} />
            </label>
            <label>
              <span>To</span>
              <input type="date" name="to" .value=${this.salesFilters.to ?? ''} />
            </label>
            <label>
              <span>Group by</span>
              <select name="groupBy" .value=${this.salesFilters.groupBy}>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </label>
            <button type="submit">Update</button>
            <div class="downloads">
              <button type="button" @click=${() => this.handleDownload('sales', 'csv')}>CSV</button>
              <button type="button" @click=${() => this.handleDownload('sales', 'pdf')}>PDF</button>
            </div>
          </form>
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
                    (row) =>
                      html`<tr>
                        <td>${row.period}</td>
                        <td>${row.invoicesCount}</td>
                        <td>${formatCurrency(row.totalCents)}</td>
                      </tr>`,
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Totals</td>
                    <td>${this.salesReport.summary.totalInvoicesCount}</td>
                    <td>${formatCurrency(this.salesReport.summary.totalCents)}</td>
                  </tr>
                </tfoot>
              </table>`
            : null}
        </article>

        <article>
          <h3>Dues by customer</h3>
          <form class="filter" @submit=${(event: Event) => this.handleDuesFilter(event)}>
            <label>
              <span>Customer</span>
              <select name="customerId">
                <option value="">All</option>
                ${this.customers.map(
                  (customer) =>
                    html`<option
                      value=${customer.id}
                      ?selected=${this.duesFilters.customerId === customer.id}
                    >
                      ${customer.name}
                    </option>`,
                )}
              </select>
            </label>
            <label>
              <span>Search</span>
              <input type="text" name="search" .value=${this.duesFilters.search ?? ''} />
            </label>
            <label>
              <span>Min balance ($)</span>
              <input
                type="number"
                name="minBalance"
                step="0.01"
                min="0"
                .value=${this.duesFilters.minBalanceCents
                  ? (this.duesFilters.minBalanceCents / 100).toString()
                  : ''}
              />
            </label>
            <button type="submit">Filter</button>
            <div class="downloads">
              <button type="button" @click=${() => this.handleDownload('dues', 'csv')}>CSV</button>
              <button type="button" @click=${() => this.handleDownload('dues', 'pdf')}>PDF</button>
            </div>
          </form>
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
                    (customer) =>
                      html`<tr>
                        <td>${customer.customerName}</td>
                        <td>${formatCurrency(customer.invoicedCents)}</td>
                        <td>${formatCurrency(customer.paidCents)}</td>
                        <td>${formatCurrency(customer.balanceCents)}</td>
                      </tr>`,
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Totals</td>
                    <td>${formatCurrency(this.duesReport.summary.totalInvoicedCents)}</td>
                    <td>${formatCurrency(this.duesReport.summary.totalPaidCents)}</td>
                    <td>${formatCurrency(this.duesReport.summary.totalBalanceCents)}</td>
                  </tr>
                </tfoot>
              </table>`
            : null}
        </article>

        <article>
          <h3>Payments ledger</h3>
          <form class="filter" @submit=${(event: Event) => this.handleLedgerFilter(event)}>
            <label>
              <span>From</span>
              <input type="date" name="from" .value=${this.ledgerFilters.from ?? ''} />
            </label>
            <label>
              <span>To</span>
              <input type="date" name="to" .value=${this.ledgerFilters.to ?? ''} />
            </label>
            <label>
              <span>Customer</span>
              <select name="customerId">
                <option value="">All</option>
                ${this.customers.map(
                  (customer) =>
                    html`<option
                      value=${customer.id}
                      ?selected=${this.ledgerFilters.customerId === customer.id}
                    >
                      ${customer.name}
                    </option>`,
                )}
              </select>
            </label>
            <label>
              <span>Order</span>
              <select name="direction" .value=${this.ledgerFilters.direction ?? 'asc'}>
                <option value="asc">Oldest first</option>
                <option value="desc">Newest first</option>
              </select>
            </label>
            <button type="submit">Apply</button>
            <div class="downloads">
              <button type="button" @click=${() => this.handleDownload('payments', 'csv')}>
                CSV
              </button>
              <button type="button" @click=${() => this.handleDownload('payments', 'pdf')}>
                PDF
              </button>
            </div>
          </form>
          <canvas id="payments-report"></canvas>
          ${this.paymentsLedger
            ? html`<table>
                <thead>
                  <tr>
                    <th>Paid at</th>
                    <th>Customer</th>
                    <th>Invoice</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Running total</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.paymentsLedger.entries.map(
                    (entry) =>
                      html`<tr>
                        <td>${new Date(entry.paidAt).toLocaleString()}</td>
                        <td>${entry.customerName}</td>
                        <td>${entry.invoiceNo ?? ''}</td>
                        <td>${entry.method}</td>
                        <td>${formatCurrency(entry.amountCents)}</td>
                        <td>${formatCurrency(entry.runningBalanceCents)}</td>
                        <td>${entry.note ?? ''}</td>
                      </tr>`,
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4">Totals</td>
                    <td>${formatCurrency(this.paymentsLedger.summary.totalPaidCents)}</td>
                    <td colspan="2">${this.paymentsLedger.summary.entriesCount} entries</td>
                  </tr>
                </tfoot>
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
