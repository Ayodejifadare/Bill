export const normalizePhoneNumber = (input: string, countryPrefix?: string): string => {
  const digitsOnly = input.replace(/\D/g, '');
  const prefixDigits = countryPrefix?.replace(/\D/g, '') ?? '';

  if (!digitsOnly) {
    return '';
  }

  if (prefixDigits && digitsOnly.startsWith(prefixDigits)) {
    return `+${digitsOnly}`;
  }

  const nationalDigits = digitsOnly.replace(/^0+/, '');

  if (!nationalDigits) {
    return '';
  }

  return prefixDigits ? `+${prefixDigits}${nationalDigits}` : `+${nationalDigits}`;
};
