import { getRegionConfig, RegionCode } from "./regions";
import {
  MOBILE_MONEY_PROVIDERS_BY_REGION,
  type ProviderRecord,
} from "../shared/financial-data";

export function getMobileMoneyProviders(
  region: RegionCode | undefined | null,
): ProviderRecord[] {
  const cfg = getRegionConfig(region);
  return MOBILE_MONEY_PROVIDERS_BY_REGION[cfg.code] ?? [];
}
