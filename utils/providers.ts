import { getRegionConfig, RegionCode } from './regions';

export type ProviderRecord = { code: string; name: string };

const PROVIDERS_BY_REGION: Record<string, ProviderRecord[]> = {
  NG: [
    { code: 'opay', name: 'Opay' },
    { code: 'palmpay', name: 'PalmPay' },
    { code: 'kuda', name: 'Kuda Bank' },
    { code: 'moniepoint', name: 'Moniepoint' },
    { code: 'carbon', name: 'Carbon' },
    { code: 'fairmoney', name: 'FairMoney' },
    { code: 'cowrywise', name: 'Cowrywise' },
    { code: 'piggyvest', name: 'PiggyVest' },
  ],
  US: [],
};

export function getMobileMoneyProviders(region: RegionCode | undefined | null): ProviderRecord[] {
  const cfg = getRegionConfig(region);
  return PROVIDERS_BY_REGION[cfg.code] ?? [];
}

