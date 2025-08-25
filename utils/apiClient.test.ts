import { describe, beforeEach, it, expect, vi } from 'vitest';

vi.mock('./config', () => ({
  apiBaseUrl: 'http://example.com',
  useMockApi: false,
}));

import { apiClient } from './apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    // simple in-memory localStorage mock
    globalThis.localStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const k in store) delete store[k]; },
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() { return Object.keys(store).length; },
    } as unknown as Storage;

    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })) as unknown as typeof fetch;
  });

  it('appends Authorization header when token is a valid JWT', async () => {
    const token = 'aaa.bbb.ccc';
    localStorage.setItem('biltip_auth', JSON.stringify({ token }));

    await apiClient('/test');

    expect(fetch).toHaveBeenCalledWith(
      'http://example.com/test',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      }),
    );
  });
});
