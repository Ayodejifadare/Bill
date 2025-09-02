import { getRegionConfig, RegionCode } from './regions';

// Region-specific bank registries. Extend without touching UI components.
const BANKS_BY_REGION: Record<string, string[]> = {
  NG: [
    'Access Bank',
    'First Bank of Nigeria',
    'First City Monument Bank (FCMB)',
    'Guaranty Trust Bank (GTBank)',
    'United Bank for Africa (UBA)',
    'Zenith Bank',
    'Polaris Bank',
    'Union Bank',
    'Fidelity Bank',
    'Ecobank',
    'Stanbic IBTC Bank',
    'Sterling Bank',
    'Keystone Bank',
    'Unity Bank',
    'Heritage Bank',
    'Standard Chartered Bank',
  ],
  US: [
    'Bank of America',
    'Chase Bank',
    'Citibank',
    'Wells Fargo',
    'U.S. Bank',
    'PNC Bank',
    'TD Bank',
    'Capital One',
  ],
};

export function getBanksForRegion(region: RegionCode | undefined | null): string[] {
  const cfg = getRegionConfig(region);
  return BANKS_BY_REGION[cfg.code] ?? [];
}

// Optional: directory with bank codes per region for screens that need codes
type BankRecord = { code: string; name: string };

const BANK_DIRECTORY_BY_REGION: Record<string, BankRecord[]> = {
  NG: [
    { code: '044', name: 'Access Bank' },
    { code: '063', name: 'Access Bank (Diamond)' },
    { code: '023', name: 'Citi Bank' },
    { code: '050', name: 'Ecobank Nigeria' },
    { code: '070', name: 'Fidelity Bank' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '214', name: 'First City Monument Bank' },
    { code: '058', name: 'GTBank' },
    { code: '030', name: 'Heritage Bank' },
    { code: '301', name: 'Jaiz Bank' },
    { code: '082', name: 'Keystone Bank' },
    { code: '221', name: 'Stanbic IBTC Bank' },
    { code: '068', name: 'Standard Chartered Bank' },
    { code: '232', name: 'Sterling Bank' },
    { code: '032', name: 'Union Bank of Nigeria' },
    { code: '033', name: 'United Bank for Africa' },
    { code: '215', name: 'Unity Bank' },
    { code: '035', name: 'Wema Bank' },
    { code: '057', name: 'Zenith Bank' },
  ],
  US: [
    { code: '026009593', name: 'Bank of America' },
    { code: '021000021', name: 'Chase Bank' },
    { code: '021000089', name: 'Citibank' },
    { code: '121000248', name: 'Wells Fargo' },
    { code: '091000019', name: 'U.S. Bank' },
    { code: '221000113', name: 'TD Bank' },
    { code: '031101279', name: 'PNC Bank' },
    { code: '031176110', name: 'Capital One' },
    { code: '061000052', name: 'Bank of the West' },
    { code: '122000661', name: 'Ally Bank' },
    { code: '124003116', name: 'Discover Bank' },
    { code: '031201360', name: 'Regions Bank' },
    { code: '063100277', name: 'Fifth Third Bank' },
    { code: '044000024', name: 'KeyBank' },
    { code: '053100300', name: 'BB&T (Truist)' },
  ],
};

export function getBankDirectoryForRegion(region: RegionCode | undefined | null): BankRecord[] {
  const cfg = getRegionConfig(region);
  return BANK_DIRECTORY_BY_REGION[cfg.code] ?? [];
}
