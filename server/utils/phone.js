export const REGION_DIAL_CODES = {
  NG: '+234',
  US: '+1',
  CA: '+1',
  GB: '+44',
  EU: '+32',
  AU: '+61'
}

export function buildPhoneVariants(rawValue = '', region = 'US') {
  if (typeof rawValue !== 'string') return []
  const trimmed = rawValue.trim()
  if (!trimmed) return []

  const variants = new Set()

  const addVariant = (value) => {
    if (!value) return
    variants.add(value)
    const digitsOnlyVariant = value.replace(/[^0-9]/g, '')
    if (digitsOnlyVariant) {
      variants.add(digitsOnlyVariant)
    }
  }

  const regionCode = REGION_DIAL_CODES[region] || REGION_DIAL_CODES.US

  let sanitized = trimmed.replace(/[^0-9+]/g, '')
  if (!sanitized) return []

  if (sanitized.startsWith('00')) {
    sanitized = '+' + sanitized.slice(2)
  }

  if (sanitized.startsWith('+')) {
    addVariant(sanitized)
  } else {
    addVariant('+' + sanitized)
  }

  const digitsOnly = sanitized.replace(/\D/g, '')

  if (!sanitized.startsWith('+') && digitsOnly) {
    if (digitsOnly.length === 10 && regionCode === '+1') {
      addVariant(regionCode + digitsOnly)
    }

    if (digitsOnly.length >= 10 && digitsOnly.startsWith('0')) {
      addVariant(regionCode + digitsOnly.slice(1))
    }
  }

  if (sanitized.startsWith('+0')) {
    addVariant(regionCode + sanitized.slice(2))
  }

  return Array.from(variants)
}
