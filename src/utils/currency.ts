export type SupportedCurrency = 'INR' | 'USD';

export interface CurrencyConfig {
  code: SupportedCurrency;
  name: string;
  symbol: string;
  label: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    label: 'Indian Rupee (INR ₹)',
    locale: 'en-IN',
  },
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    label: 'US Dollar (USD $)',
    locale: 'en-US',
  },
};

export const CURRENCY_OPTIONS: CurrencyConfig[] = [
  SUPPORTED_CURRENCIES.INR,
  SUPPORTED_CURRENCIES.USD,
];

/**
 * Returns symbol for given currency code
 */
export function getCurrencySymbol(currency?: string): string {
  const code = (currency || 'INR').toUpperCase();
  if (code === 'INR') return '₹';
  if (code === 'USD') return '$';
  return code;
}

/**
 * Formats a currency amount with correct locale formatting and symbol.
 * Never silently converts values or invents exchange rates.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'INR',
  options: { includeDecimals?: boolean; compact?: boolean } = {}
): string {
  const code = (currency || 'INR').toUpperCase() as SupportedCurrency;
  const config = SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.INR;
  const num = Number.isFinite(amount) ? amount : 0;

  try {
    const formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: options.includeDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
    return formatter.format(num);
  } catch {
    const symbol = config.symbol || '₹';
    return `${symbol}${num.toLocaleString()}`;
  }
}

/**
 * Summarizes invoices by currency without combining different currencies.
 * Prevents mixing distinct currencies into an invalid aggregate sum.
 */
export interface CurrencyGroupSummary {
  currency: string;
  symbol: string;
  outstanding: number;
  collected: number;
  total: number;
  count: number;
  formattedOutstanding: string;
  formattedCollected: string;
  formattedTotal: string;
}

export function summarizeInvoicesByCurrency(
  invoices: { amount: number; currency?: string; status: string }[]
): CurrencyGroupSummary[] {
  const groups: Record<string, { outstanding: number; collected: number; total: number; count: number }> = {};

  for (const inv of invoices) {
    const cur = (inv.currency || 'INR').toUpperCase();
    if (!groups[cur]) {
      groups[cur] = { outstanding: 0, collected: 0, total: 0, count: 0 };
    }
    const amt = inv.amount || 0;
    groups[cur].total += amt;
    groups[cur].count += 1;
    if (inv.status === 'paid') {
      groups[cur].collected += amt;
    } else {
      groups[cur].outstanding += amt;
    }
  }

  const entries = Object.entries(groups);
  if (entries.length === 0) {
    return [];
  }

  return entries.map(([currency, data]) => ({
    currency,
    symbol: getCurrencySymbol(currency),
    outstanding: data.outstanding,
    collected: data.collected,
    total: data.total,
    count: data.count,
    formattedOutstanding: formatCurrency(data.outstanding, currency),
    formattedCollected: formatCurrency(data.collected, currency),
    formattedTotal: formatCurrency(data.total, currency),
  }));
}
