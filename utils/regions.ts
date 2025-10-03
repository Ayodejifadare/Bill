// Centralized region configuration and helpers for currency, phone, etc.

export type RegionCode = string; // ISO 3166-1 alpha-2 preferred (e.g., 'US', 'NG', 'GB')

export interface RegionConfig {
  code: RegionCode;
  name: string;
  currencyCode: string; // e.g., 'USD', 'NGN', 'GBP'
  currencySymbol: string; // e.g., '$', '₦', '£'
  phoneCountryCode: string; // e.g., '+1', '+234'
  features: {
    bankTransfers: boolean;
    mobileMoney: boolean;
    requiresRoutingNumber: boolean;
  };
}

// Minimal starter registry. Extend as needed without touching UI code.
const REGION_MAP: Record<RegionCode, RegionConfig> = {
  US: {
    code: 'US',
    name: 'United States',
    currencyCode: 'USD',
    currencySymbol: '$',
    phoneCountryCode: '+1',
    features: {
      bankTransfers: true,
      mobileMoney: false,
      requiresRoutingNumber: true,
    },
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    currencyCode: 'NGN',
    currencySymbol: '₦',
    phoneCountryCode: '+234',
    features: {
      bankTransfers: true,
      mobileMoney: true,
      requiresRoutingNumber: false,
    },
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currencyCode: 'GBP',
    currencySymbol: '£',
    phoneCountryCode: '+44',
    features: {
      bankTransfers: true,
      mobileMoney: false,
      requiresRoutingNumber: false,
    },
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    currencyCode: 'CAD',
    currencySymbol: '$',
    phoneCountryCode: '+1',
    features: {
      bankTransfers: true,
      mobileMoney: false,
      requiresRoutingNumber: true,
    },
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    currencyCode: 'AUD',
    currencySymbol: '$',
    phoneCountryCode: '+61',
    features: {
      bankTransfers: true,
      mobileMoney: false,
      requiresRoutingNumber: false,
    },
  },
  EU: {
    code: 'EU',
    name: 'European Union',
    currencyCode: 'EUR',
    currencySymbol: '€',
    phoneCountryCode: '+00',
    features: {
      bankTransfers: true,
      mobileMoney: false,
      requiresRoutingNumber: false,
    },
  },
};

// Nigeria is the primary region by default
const DEFAULT_REGION: RegionConfig = REGION_MAP.NG;

export function getRegionConfig(region: RegionCode | undefined | null): RegionConfig {
  if (!region) return DEFAULT_REGION;
  const key = region.toUpperCase();
  return REGION_MAP[key] ?? {
    code: key,
    name: key,
    currencyCode: DEFAULT_REGION.currencyCode,
    currencySymbol: DEFAULT_REGION.currencySymbol,
    phoneCountryCode: DEFAULT_REGION.phoneCountryCode,
    features: DEFAULT_REGION.features,
  };
}

export function getCurrencySymbol(region: RegionCode | undefined | null): string {
  return getRegionConfig(region).currencySymbol;
}

export function getCurrencyCode(region: RegionCode | undefined | null): string {
  return getRegionConfig(region).currencyCode;
}

export function formatPhoneForRegion(region: RegionCode | undefined | null, phone: string): string {
  const code = getRegionConfig(region).phoneCountryCode;
  if (!phone || !code) return phone;
  return phone.startsWith(code) ? phone.replace(code, `${code} `) : phone;
}

export function formatBankAccountForRegion(region: RegionCode | undefined | null, accountNumber: string): string {
  const r = getRegionConfig(region);
  if (!accountNumber) return accountNumber;
  // Simple examples; override per-country as needed.
  if (r.code === 'NG') {
    // 10-digit: 1234 5678 90
    return accountNumber.replace(/(\d{4})(\d{4})(\d{2})/, '$1 $2 $3');
  }
  if (r.code === 'US') {
    // Display as-is; US varies by bank
    return accountNumber;
  }
  return accountNumber;
}

export function resolveRegionFromLocale(locale: string | undefined | null): RegionCode {
  if (!locale) return DEFAULT_REGION.code;
  const lower = locale.toLowerCase();
  // If locale like en-US or fr-ng, use the country part
  const parts = lower.split(/[-_]/);
  const country = parts[1]?.toUpperCase();
  if (country && country.length === 2) return country;
  // Fallbacks
  if (lower.includes('nigeria')) return 'NG';
  if (lower.includes('us') || lower.includes('united states')) return 'US';
  return DEFAULT_REGION.code;
}

export function resolveRegionFromCurrency(currency: string | undefined | null): RegionCode | undefined {
  if (!currency) return undefined;
  const normalized = currency.toUpperCase();
  const match = Object.values(REGION_MAP).find(region => region.currencyCode === normalized);
  return match?.code;
}

export function resolveRegionForSignup(country: string | undefined | null, phone: string | undefined | null): RegionCode {
  const normalizedCountry = country?.toUpperCase();
  if (normalizedCountry && REGION_MAP[normalizedCountry]) {
    return REGION_MAP[normalizedCountry].code;
  }

  const normalizedPhone = phone?.replace(/[^\d+]/g, '') ?? '';
  if (normalizedPhone.startsWith('+234')) return 'NG';
  if (normalizedPhone.startsWith('+44')) return 'GB';
  if (normalizedPhone.startsWith('+61')) return 'AU';
  if (normalizedPhone.startsWith('+353')) return 'EU';
  if (normalizedPhone.startsWith('+1')) {
    // Default North American region when country is unknown.
    return 'US';
  }

  return DEFAULT_REGION.code;
}

// Feature helpers
export function requiresRoutingNumber(region: RegionCode | undefined | null): boolean {
  return getRegionConfig(region).features.requiresRoutingNumber;
}

export function isMobileMoneyEnabled(region: RegionCode | undefined | null): boolean {
  return getRegionConfig(region).features.mobileMoney;
}

export function getBankIdentifierLabel(region: RegionCode | undefined | null): string {
  return requiresRoutingNumber(region) ? 'Routing Number' : 'Sort Code';
}

export function validateBankAccountNumber(region: RegionCode | undefined | null, accountNumber: string): boolean {
  const r = getRegionConfig(region);
  const onlyDigits = (accountNumber || '').replace(/\D/g, '');
  if (r.code === 'NG') return onlyDigits.length === 10;
  // Default: allow 6–17 digits for flexibility across countries
  return onlyDigits.length >= 6 && onlyDigits.length <= 17;
}

export function getBankAccountLength(region: RegionCode | undefined | null): number | undefined {
  const r = getRegionConfig(region);
  if (r.code === 'NG') return 10;
  return undefined;
}

// Locale + currency formatting
export function getLocaleForRegion(region: RegionCode | undefined | null): string {
  const r = getRegionConfig(region);
  if (r.code === 'NG') return 'en-NG';
  if (r.code === 'US') return 'en-US';
  if (r.code === 'GB') return 'en-GB';
  if (r.code === 'CA') return 'en-CA';
  if (r.code === 'AU') return 'en-AU';
  if (r.code === 'EU') return 'en-IE';
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en-US';
}

export function formatCurrencyForRegion(region: RegionCode | undefined | null, amount: number): string {
  const locale = getLocaleForRegion(region);
  const currency = getCurrencyCode(region);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'symbol', maximumFractionDigits: 2 }).format(amount);
  } catch {
    const symbol = getCurrencySymbol(region)
    return `${symbol}${amount.toFixed(2)}`
  }
}

