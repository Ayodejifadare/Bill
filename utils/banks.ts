import { getRegionConfig, RegionCode } from "./regions";
import {
  BANKS_BY_REGION,
  BANK_DIRECTORY_BY_REGION,
  type BankRecord,
} from "../shared/financial-data";

export function getBanksForRegion(
  region: RegionCode | undefined | null,
): string[] {
  const cfg = getRegionConfig(region);
  return BANKS_BY_REGION[cfg.code] ?? [];
}

export function getBankDirectoryForRegion(
  region: RegionCode | undefined | null,
): BankRecord[] {
  const cfg = getRegionConfig(region);
  return BANK_DIRECTORY_BY_REGION[cfg.code] ?? [];
}
