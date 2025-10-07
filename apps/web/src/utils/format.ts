const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getCurrencyFormatter = (currency: string, locale: string) => {
  const key = `${locale}:${currency}`;
  if (!currencyFormatterCache.has(key)) {
    currencyFormatterCache.set(
      key,
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  }
  return currencyFormatterCache.get(key)!;
};

const getDateFormatter = (locale: string, options?: Intl.DateTimeFormatOptions) => {
  const key = JSON.stringify({ locale, options });
  if (!dateFormatterCache.has(key)) {
    dateFormatterCache.set(key, new Intl.DateTimeFormat(locale, options));
  }
  return dateFormatterCache.get(key)!;
};

export const centsToNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 0;
  return value / 100;
};

export const numberToCents = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
};

export const formatCurrency = (valueCents: number, currency = 'USD', locale = 'en-US') =>
  getCurrencyFormatter(currency, locale).format(centsToNumber(valueCents));

export const formatDate = (value: string, locale = 'en-US', options?: Intl.DateTimeFormatOptions) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return getDateFormatter(locale, options).format(date);
};

export const formatRelativeDate = (value: string, locale = 'en-US') => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffDays = Math.round(diff / (1000 * 60 * 60 * 24));
  if (Math.abs(diffDays) > 14) {
    return formatDate(value, locale, { dateStyle: 'medium' });
  }
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return formatter.format(-diffDays, 'day');
};

export const formatInvoiceStatus = (status: string) => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'issued':
      return 'Issued';
    case 'partial':
      return 'Partially Paid';
    case 'paid':
      return 'Paid';
    case 'void':
      return 'Voided';
    default:
      return status;
  }
};
