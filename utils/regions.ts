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
