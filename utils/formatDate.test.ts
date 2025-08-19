import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { vi } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  const baseDate = new Date('2025-01-15T12:00:00Z');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(baseDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns Today for current date', () => {
    expect(formatDate('2025-01-15T09:00:00Z')).toBe('Today');
  });

  it('returns Yesterday for previous day', () => {
    expect(formatDate('2025-01-14T09:00:00Z')).toBe('Yesterday');
  });

  it('returns days ago for dates within the last week', () => {
    expect(formatDate('2025-01-10T09:00:00Z')).toBe('5 days ago');
  });

  it('formats dates older than a week within the same year', () => {
    expect(formatDate('2025-01-01T12:00:00Z')).toBe('Jan 1');
  });

  it('includes year for dates in different years', () => {
    expect(formatDate('2024-12-31T12:00:00Z')).toBe('Dec 31, 2024');
  });
});
