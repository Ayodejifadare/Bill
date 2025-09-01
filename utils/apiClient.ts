import { apiBaseUrl, useMockApi, useDevAuth, devUserId } from './config';
import { handle as mockFriends } from '../mocks/friends';
import { handle as mockGroups } from '../mocks/groups';
import { handle as mockUpcomingPayments } from '../mocks/upcoming-payments';
import { handle as mockContacts } from '../mocks/contacts';
import { handle as mockRequests } from '../mocks/requests';
import { handle as mockAuth } from '../mocks/auth';
import { handle as mockUsers } from '../mocks/users';
import { clearAuth } from './auth';

type MockHandler = (path: string, init?: RequestInit) => Promise<any>;

const mockRoutes: Array<{ test: RegExp; handler: MockHandler }> = [
  { test: /^\/friends/, handler: mockFriends },
  { test: /^\/groups/, handler: mockGroups },
  { test: /^\/upcoming-payments/, handler: mockUpcomingPayments },
  { test: /^\/contacts\/match/, handler: mockContacts },
  { test: /^\/requests/, handler: mockRequests },
  { test: /^\/auth/, handler: mockAuth },
  { test: /^\/users/, handler: mockUsers },
];

export async function apiClient(
  input: RequestInfo | URL,
  init: RequestInit = {}
) {
  const storedAuth = typeof window !== 'undefined' ? localStorage.getItem('biltip_auth') : null;
  const token = storedAuth ? (() => {
    try { return JSON.parse(storedAuth).token as string | null; } catch { return null; }
  })() : null;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  // token is expected to be a JWT (three base64url segments)
  // Accept any token when using the mock API or in development to allow
  // local development flows without requiring a real JWT.
  const tokenIsValid = typeof token === 'string'
    && (
      useMockApi
      || process.env.NODE_ENV === 'development'
      || /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)
    );

  if (process.env.NODE_ENV === 'development') {
    console.debug('apiClient token:', token, 'valid JWT:', tokenIsValid);
  }

  if (tokenIsValid) {
    headers['Authorization'] = `Bearer ${token}`;
    if (process.env.NODE_ENV === 'development') {
      console.debug('apiClient Authorization header appended');
    }
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.debug(
        'apiClient Authorization header omitted',
        'storedAuth:', storedAuth,
        'tokenIsValid:', tokenIsValid,
      );
    }
    if (token) {
      console.warn('Invalid auth token, Authorization header omitted');
      clearAuth();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
    }
  }

  // Dev-mode auth bypass using backend's x-user-id hook
  if (!headers['Authorization'] && useDevAuth) {
    // Prefer explicit env user id, else fall back to stored user id
    let xUserId = devUserId;
    if (!xUserId && typeof window !== 'undefined') {
      try {
        const rawUser = localStorage.getItem('biltip_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed?.id) xUserId = String(parsed.id);
        }
      } catch {/* ignore */}
    }
    if (xUserId) {
      headers['x-user-id'] = xUserId;
    }
    if (process.env.NODE_ENV === 'development') {
      console.debug('apiClient x-user-id header appended for dev auth');
    }
  }

  const resource = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.pathname + input.search
      : String(input);
  const url = resource.startsWith('http')
    ? resource
    : resource.startsWith(apiBaseUrl)
      ? resource
      : `${apiBaseUrl}${resource}`;

  if (useMockApi) {
    const path = resource.startsWith('http')
      ? new URL(resource).pathname
      : resource;
    const normalized = path.startsWith(apiBaseUrl) ? path.slice(apiBaseUrl.length) || '/' : path;
    const route = mockRoutes.find(r => r.test.test(normalized));
    if (route) {
      return route.handler(normalized, { ...init, headers });
    }
  }

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      // Special-case onboarding requirement to enable client handling
      if (response.status === 403 && (data?.error === 'onboarding_required')) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('onboarding-required', { detail: data }));
        }
      }
      message = data?.message || data?.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  // Attempt to parse JSON response, return null if none
  try {
    return await response.json();
  } catch {
    return null;
  }
}
