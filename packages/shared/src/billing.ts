/**
 * Supported rounding modes for currency calculations.
 * - `HALF_UP`: values with a fractional part of 0.5 or greater round away from zero.
 * - `HALF_DOWN`: values with a fractional part of 0.5 round toward zero.
 * - `HALF_EVEN`: values with a fractional part of 0.5 round to the nearest even integer.
 * - `CEIL`: rounds toward positive infinity.
 * - `FLOOR`: rounds toward negative infinity.
 * - `TRUNCATE`: removes the fractional part without rounding.
 */
export type RoundingMode =
  | 'HALF_UP'
  | 'HALF_DOWN'
  | 'HALF_EVEN'
  | 'CEIL'
  | 'FLOOR'
  | 'TRUNCATE';

export interface RoundingConfig {
  /** Number of decimal places to retain. Defaults to 0 for cent values. */
  decimals?: number;
  /** Strategy to use when rounding. Defaults to `HALF_EVEN` for deterministic behavior. */
  mode?: RoundingMode;
}

const getRoundingConfig = (config?: RoundingConfig) => ({
  decimals: config?.decimals ?? 0,
  mode: config?.mode ?? 'HALF_EVEN'
});

const EPSILON = 1e-10;

const toFixedPrecision = (value: number, precision: number) =>
  Math.round(value * precision) / precision;

const roundScaledValue = (scaled: number, mode: RoundingMode) => {
  if (!Number.isFinite(scaled)) return scaled;

  const normalized = toFixedPrecision(scaled, 1e9);
  if (Number.isInteger(normalized)) {
    return normalized;
  }

  const sign = normalized < 0 ? -1 : 1;
  const absolute = Math.abs(normalized);
  const floorAbs = Math.floor(absolute);
  const fraction = absolute - floorAbs;
  const ceilAbs = fraction > 0 ? floorAbs + 1 : floorAbs;

  const isTie = Math.abs(fraction - 0.5) <= EPSILON;

  switch (mode) {
    case 'TRUNCATE':
      return Math.trunc(normalized);
    case 'CEIL':
      return Math.ceil(normalized);
    case 'FLOOR':
      return Math.floor(normalized);
    case 'HALF_UP':
      if (fraction > 0.5 + EPSILON) return sign * ceilAbs;
      if (fraction < 0.5 - EPSILON) return sign * floorAbs;
      return sign * ceilAbs;
    case 'HALF_DOWN':
      if (fraction > 0.5 + EPSILON) return sign * ceilAbs;
      if (fraction < 0.5 - EPSILON) return sign * floorAbs;
      return sign * floorAbs;
    case 'HALF_EVEN':
    default:
      if (fraction > 0.5 + EPSILON) return sign * ceilAbs;
      if (fraction < 0.5 - EPSILON) return sign * floorAbs;
      const roundedAbs = isTie && floorAbs % 2 !== 0 ? ceilAbs : floorAbs;
      return sign * roundedAbs;
  }
};

/**
 * Rounds a numeric value deterministically using configurable strategies. The implementation avoids
 * floating-point drift by normalizing the scaled value before applying the chosen rounding mode.
 */
export const roundValue = (value: number, config?: RoundingConfig) => {
  const { decimals, mode } = getRoundingConfig(config);
  const factor = 10 ** decimals;
  const scaled = value * factor;
  const rounded = roundScaledValue(scaled, mode);
  return toFixedPrecision(rounded / factor, 1e9);
};

export interface InvoiceNumberConfig {
  /** Prefix applied before the date and sequence, e.g. `INV`. */
  prefix?: string;
  /**
   * Determines how the date portion is rendered. The default uses `YYYYMM` for chronological sorting.
   */
  dateFormatter?: (date: Date) => string;
  /** Minimum digits to pad the incrementing sequence with. */
  sequencePadding?: number;
}

const defaultDateFormatter = (date: Date) =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

/**
 * Returns the prefix for an invoice series (e.g. `INV-202402`). Useful for querying existing
 * invoices when generating the next number in a deterministic fashion.
 */
export const resolveInvoiceSeriesKey = (date = new Date(), config?: InvoiceNumberConfig) => {
  const { prefix = 'INV', dateFormatter = defaultDateFormatter } = config ?? {};
  return `${prefix}-${dateFormatter(date)}`;
};

/**
 * Builds an invoice number given the current sequence counter. The function is pure; callers are
 * responsible for providing the sequence that should follow the last persisted invoice.
 */
export const buildInvoiceNumber = (sequence: number, date = new Date(), config?: InvoiceNumberConfig) => {
  if (!Number.isFinite(sequence) || sequence < 0) {
    throw new Error('sequence must be a non-negative finite number');
  }

  const { sequencePadding = 4 } = config ?? {};

  const seriesKey = resolveInvoiceSeriesKey(date, config);

  const paddedSequence = String(Math.trunc(sequence)).padStart(sequencePadding, '0');
  return `${seriesKey}-${paddedSequence}`;
};

export type InvoiceLineInput<T extends Record<string, unknown> = Record<string, never>> = {
  quantity: number;
  /** Unit price expressed in the smallest currency unit (e.g. cents). */
  unitPriceCents: number;
} & T;

export type InvoiceLineTotal<T extends Record<string, unknown> = Record<string, never>> =
  InvoiceLineInput<T> & {
    lineTotalCents: number;
  };

export interface InvoiceTotalsInput<T extends Record<string, unknown> = Record<string, never>> {
  items: InvoiceLineInput<T>[];
  /** Optional absolute discount in cents. Negative values represent additional charges. */
  discountCents?: number;
  /** Optional tax rate expressed as a decimal (e.g. 0.15 for 15%). */
  taxRate?: number;
  /** Optional tax override in cents, applied instead of `taxRate` when provided. */
  taxCents?: number;
}

export interface InvoiceTotalsResult<T extends Record<string, unknown> = Record<string, never>> {
  items: InvoiceLineTotal<T>[];
  subTotalCents: number;
  discountCents: number;
  taxCents: number;
  grandTotalCents: number;
}

const normalizeMoneyInput = (value: number | undefined, fallback = 0) => {
  if (value === undefined || Number.isNaN(value)) return fallback;
  if (!Number.isFinite(value)) {
    throw new Error('Monetary values must be finite numbers');
  }
  return value;
};

/**
 * Calculates line totals, discount, tax, and the resulting grand total. The function gracefully
 * handles returns (negative quantities) and zero-value lines while ensuring deterministic rounding.
 */
export const calculateInvoiceTotals = <
  T extends Record<string, unknown> = Record<string, never>
>(
  input: InvoiceTotalsInput<T>,
  rounding?: RoundingConfig
): InvoiceTotalsResult<T> => {
  const roundingConfig = getRoundingConfig(rounding);
  const items = input.items.map(item => {
    const { quantity: rawQuantity, unitPriceCents: rawUnitPriceCents, ...rest } = item;
    const quantity = normalizeMoneyInput(rawQuantity);
    const unitPriceCents = normalizeMoneyInput(rawUnitPriceCents);
    const rawTotal = quantity * unitPriceCents;
    const lineTotalCents = roundValue(rawTotal, roundingConfig);
    return {
      ...(rest as unknown as T),
      quantity,
      unitPriceCents,
      lineTotalCents
    };
  });

  const subTotal = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const discount = normalizeMoneyInput(input.discountCents);

  if (roundingConfig.decimals !== 0) {
    throw new Error('Invoice calculations expect rounding to operate on cent values (decimals=0)');
  }

  const taxFromRate =
    input.taxCents === undefined && input.taxRate !== undefined
      ? roundValue((subTotal - discount) * input.taxRate, roundingConfig)
      : undefined;
  const tax = normalizeMoneyInput(input.taxCents ?? taxFromRate ?? 0);

  const grandTotal = subTotal - discount + tax;

  return {
    items,
    subTotalCents: subTotal,
    discountCents: discount,
    taxCents: tax,
    grandTotalCents: grandTotal
  };
};

/**
 * Computes the remaining amount due for a customer based on invoice totals and recorded payments.
 */
export const calculateCustomerDueCents = (
  invoicesCents: number,
  paymentsCents: number,
  rounding?: RoundingConfig
) => {
  const roundingConfig = getRoundingConfig(rounding);
  if (roundingConfig.decimals !== 0) {
    throw new Error('Customer due calculations expect cent precision (decimals=0)');
  }
  const invoices = normalizeMoneyInput(invoicesCents);
  const payments = normalizeMoneyInput(paymentsCents);
  return roundValue(invoices - payments, roundingConfig);
};
