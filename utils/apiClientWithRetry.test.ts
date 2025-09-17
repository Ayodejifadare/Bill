import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mockApiClient = vi.hoisted(() => vi.fn());

vi.mock('./apiClient', () => ({
  apiClient: mockApiClient,
}));

import { apiClientWithRetry } from './apiClientWithRetry';

describe('apiClientWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockApiClient.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('retries failed requests with exponential backoff delays', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    try {
      const init: RequestInit = {
        method: 'POST',
        headers: {
          'x-test': 'retry',
        },
      };

      const response = { success: true };

      mockApiClient
        .mockRejectedValueOnce(new Error('first failure'))
        .mockRejectedValueOnce(new Error('second failure'))
        .mockResolvedValueOnce(response);

      const promise = apiClientWithRetry<typeof response>('https://example.com/resource', init, 3, 50);

      expect(mockApiClient).toHaveBeenCalledTimes(1);
      expect(mockApiClient).toHaveBeenLastCalledWith('https://example.com/resource', init);

      await vi.advanceTimersByTimeAsync(50);
      expect(mockApiClient).toHaveBeenCalledTimes(2);
      expect(mockApiClient).toHaveBeenLastCalledWith('https://example.com/resource', init);

      await vi.advanceTimersByTimeAsync(100);
      expect(mockApiClient).toHaveBeenCalledTimes(3);
      expect(mockApiClient).toHaveBeenLastCalledWith('https://example.com/resource', init);

      await expect(promise).resolves.toEqual(response);

      expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy.mock.calls[0][1]).toBe(50);
      expect(setTimeoutSpy.mock.calls[1][1]).toBe(100);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it('propagates the final error when retries are exhausted', async () => {
    const firstError = new Error('temporary failure');
    const finalError = new Error('persistent failure');

    mockApiClient
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(finalError);

    const promise = apiClientWithRetry('https://example.com/fail', undefined, 2, 25);
    const expectation = expect(promise).rejects.toBe(finalError);

    await vi.advanceTimersByTimeAsync(25);

    await expectation;
    expect(mockApiClient).toHaveBeenCalledTimes(2);
  });

  it('forwards init options on every attempt and preserves generic typing', async () => {
    interface TestResponse {
      value: number;
    }

    const init: RequestInit = {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ update: true }),
    };

    const resultValue: TestResponse = { value: 42 };

    mockApiClient
      .mockRejectedValueOnce(new Error('retry once'))
      .mockResolvedValueOnce(resultValue);

    const promise = apiClientWithRetry<TestResponse>('https://example.com/typed', init, 2, 10);

    await vi.advanceTimersByTimeAsync(10);

    const result: TestResponse = await promise;

    expect(result).toEqual(resultValue);
    expect(mockApiClient).toHaveBeenCalledTimes(2);
    expect(mockApiClient.mock.calls[0][1]).toBe(init);
    expect(mockApiClient.mock.calls[1][1]).toBe(init);
  });
});
