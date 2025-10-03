import { describe, expect, it } from 'vitest';
import { normalizePhoneNumber } from './phone';

describe('normalizePhoneNumber', () => {
  it('returns empty string when input has no digits', () => {
    expect(normalizePhoneNumber('', '+234')).toBe('');
  });

  it('removes leading zeros and prepends selected country code for local numbers', () => {
    expect(normalizePhoneNumber('0801 234 5678', '+234')).toBe('+2348012345678');
  });

  it('keeps pasted E.164 numbers without duplicating the country code', () => {
    expect(normalizePhoneNumber('+2348012345678', '+234')).toBe('+2348012345678');
  });

  it('treats numbers that start with the prefix digits as already normalized', () => {
    expect(normalizePhoneNumber('2348012345678', '+234')).toBe('+2348012345678');
  });

  it('falls back to returning an international format when no country prefix is provided', () => {
    expect(normalizePhoneNumber('15551234567')).toBe('+15551234567');
  });
});
