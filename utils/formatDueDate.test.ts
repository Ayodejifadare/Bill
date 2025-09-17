import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { vi } from 'vitest';
import { formatDueDate } from './formatDueDate';

describe('formatDueDate', () => {
  const baseDate = new Date('2025-01-15T12:00:00Z');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(baseDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('returns Today for the current date', () => {
    expect(formatDueDate('2025-01-15T09:00:00Z')).toBe('Today');
  });

  it('returns Tomorrow for the next day', () => {
    expect(formatDueDate('2025-01-16T09:00:00Z')).toBe('Tomorrow');
  });

  it('returns relative phrasing for upcoming dates', () => {
    expect(formatDueDate('2025-01-18T00:00:00Z')).toBe('in 3 days');
  });

  it('returns Overdue for past dates within a day', () => {
    expect(formatDueDate('2025-01-14T23:00:00Z')).toBe('Overdue');
  });

  it('returns Overdue by n days for older past dates', () => {
    expect(formatDueDate('2025-01-10T12:00:00Z')).toBe('Overdue by 5 days');
  });

  it('returns empty string for invalid input', () => {
    expect(formatDueDate('not-a-real-date')).toBe('');
    expect(formatDueDate('')).toBe('');
  });
});
