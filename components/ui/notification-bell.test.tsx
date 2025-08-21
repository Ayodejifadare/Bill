import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationBell } from './notification-bell';

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls for unread notifications', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ count: 0 }) });
    global.fetch = fetchMock as any;

    render(<NotificationBell onClick={() => {}} />);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(60000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('displays error when fetch fails', async () => {
    vi.useRealTimers();
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;

    render(<NotificationBell onClick={() => {}} />);

    expect(
      await screen.findByText('Failed to fetch unread notifications')
    ).toBeInTheDocument();
  });
});

