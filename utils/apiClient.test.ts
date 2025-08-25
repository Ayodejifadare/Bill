import { describe, beforeEach, it, expect, vi } from 'vitest';

let mockUseMockApi = false;
vi.mock('./config', () => ({
  apiBaseUrl: 'http://example.com',
  get useMockApi() {
    return mockUseMockApi;
  },
}));

import { apiClient } from './apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    mockUseMockApi = false;
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

  it('appends Authorization header for any token when using mock API', async () => {
    mockUseMockApi = true;
    const token = 'mock-token';
    localStorage.setItem('biltip_auth', JSON.stringify({ token }));

    await apiClient('/test');

    expect(fetch).toHaveBeenCalledWith(
      'http://example.com/test',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      }),
    );
  });

  it('appends Authorization header even when token is malformed', async () => {
    const token = 'invalidtoken';
    localStorage.setItem('biltip_auth', JSON.stringify({ token }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await apiClient('/test');

    expect(fetch).toHaveBeenCalledWith(
      'http://example.com/test',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      }),
    );
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns mock profile data when using mock API', async () => {
    mockUseMockApi = true;

    const result = await apiClient('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: '+123', otp: '000000' }),
    });

    expect(result).toMatchObject({
      token: expect.stringMatching(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/),
      user: {
        id: 'demo-user',
        name: 'Demo User',
        phone: '+123',
      },
    });
  });
});
