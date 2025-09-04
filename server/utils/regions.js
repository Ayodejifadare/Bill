// Region configuration and validation helpers

// Minimal region registry matching the frontend
const REGION_MAP = {
  US: {
    code: 'US',
    phoneCountryCode: '+1'
  },
  NG: {
    code: 'NG',
    phoneCountryCode: '+234'
  }
}

const DEFAULT_REGION = REGION_MAP.NG

export function getRegionConfig(region) {
  if (!region) return DEFAULT_REGION
  const key = region.toUpperCase()
  return REGION_MAP[key] || { code: key, phoneCountryCode: DEFAULT_REGION.phoneCountryCode }
}

export function validateBankAccountNumber(region, accountNumber) {
  const { code } = getRegionConfig(region)
  const onlyDigits = (accountNumber || '').replace(/\D/g, '')
  if (code === 'NG') return onlyDigits.length === 10
  // Default: allow 6–17 digits
  return onlyDigits.length >= 6 && onlyDigits.length <= 17
}

export function hasValidPhonePrefix(region, phoneNumber) {
  const { phoneCountryCode } = getRegionConfig(region)
  if (!phoneCountryCode) return true
  return (phoneNumber || '').startsWith(phoneCountryCode)
}
