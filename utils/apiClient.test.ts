import { describe, beforeEach, it, expect, vi } from 'vitest';

let mockUseMockApi = false;
vi.mock('./config', () => ({
  apiBaseUrl: 'http://example.com',
  get useMockApi() {
    return mockUseMockApi;
  },
}));

import { apiClient, ApiRedirectError } from './apiClient';

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

  it('returns mock profile data when using mock API', async () => {
    mockUseMockApi = true;

    const result = await apiClient('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: '+123', otp: '000000' }),
    });

    expect(result).toMatchObject({
      token: 'mock-token',
      user: {
        id: 'demo-user',
        name: 'Demo User',
        phone: '+123',
      },
    });
  });

  it('clears stored auth and dispatches session-expired for invalid tokens', async () => {
    const token = 'invalid';
    localStorage.setItem('biltip_auth', JSON.stringify({ token }));
    localStorage.setItem('biltip_user', JSON.stringify({ name: 'Tester' }));
    const listener = vi.fn();
    window.addEventListener('session-expired', listener);

    await apiClient('/test');

    expect(localStorage.getItem('biltip_auth')).toBeNull();
    expect(localStorage.getItem('biltip_user')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    const [, options] = (fetch as any).mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();

    window.removeEventListener('session-expired', listener);
  });

  it('throws ApiRedirectError on 307 redirect', async () => {
    (fetch as any).mockResolvedValueOnce({
      status: 307,
      ok: false,
      json: () => Promise.resolve({ redirect: '/onboarding' }),
    });

    await expect(apiClient('/test')).rejects.toBeInstanceOf(ApiRedirectError);
  });
});
