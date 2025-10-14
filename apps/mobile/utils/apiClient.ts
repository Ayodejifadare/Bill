import { apiBaseUrl, useMockApi, useDevAuth, devUserId } from './config';
import { loadAuthToken, loadUserId, clearAuth } from './auth';
import { handle as mockFriends } from '../../../mocks/friends';
import { handle as mockGroups } from '../../../mocks/groups';
import { handle as mockUpcomingPayments } from '../../../mocks/upcoming-payments';
import { handle as mockRequests } from '../../../mocks/requests';
import { handle as mockTransactions } from '../../../mocks/transactions';
import { handle as mockNotifications } from '../../../mocks/notifications';
import { handle as mockBillSplits } from '../../../mocks/bill-splits';
import { handle as mockAuth } from '../../../mocks/auth';
import { handle as mockUsers } from '../../../mocks/users';

type MockHandler = (path: string, init?: RequestInit) => Promise<any>;

const mockRoutes: Array<{ test: RegExp; handler: MockHandler }> = [
  { test: /^\/contacts/, handler: mockFriends },
  { test: /^\/friends/, handler: mockFriends },
  { test: /^\/groups/, handler: mockGroups },
  { test: /^\/upcoming-payments/, handler: mockUpcomingPayments },
  { test: /^\/requests/, handler: mockRequests },
  { test: /^\/auth/, handler: mockAuth },
  { test: /^\/users/, handler: mockUsers },
  { test: /^\/api\/users/, handler: mockUsers },
  { test: /^\/api\/transactions(\/|$)/, handler: mockTransactions },
  { test: /^\/api\/notifications(\/|$)/, handler: mockNotifications },
  { test: /^\/bill-splits(\/|$)/, handler: mockBillSplits },
];

function joinUrl(base: string, resource: string): string {
  if (/^https?:\/\//i.test(resource)) return resource;
  const baseNorm = (base || '').replace(/\/+$/, '');
  const isAbsoluteBase = /^https?:\/\//i.test(baseNorm);
  if (isAbsoluteBase) {
    const u = new URL(baseNorm);
    const basePath = u.pathname.replace(/\/+$/, '');
    const baseHasApi = /(^|\/)api(\/|$)/.test(basePath);
    let resPath = resource.startsWith('/') ? resource : `/${resource}`;
    if (!baseHasApi && !resPath.startsWith('/api/')) {
      resPath = `/api${resPath}`;
    }
    const finalPath = resPath.startsWith(basePath + '/') || resPath === basePath ? resPath : `${basePath}${resPath}`;
    return `${u.origin}${finalPath}`;
  }
  if (resource.startsWith('/api/')) return resource.replace(/\/{2,}/g, '/');
  const left = baseNorm || '';
  const right = resource.replace(/^\/+/, '');
  return `${left}/${right}`.replace(/\/{2,}/g, '/');
}

export async function apiClient(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = await loadAuthToken();
  const headers: Record<string, string> = { ...(init.headers as any) };
  const tokenIsValid = typeof token === 'string' && /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token);
  if (tokenIsValid) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (useDevAuth) {
    const uid = devUserId || (await loadUserId());
    if (uid) headers['x-user-id'] = uid;
  }

  const resource =
    typeof input === 'string' ? input : input instanceof URL ? input.pathname + input.search : String(input);
  const url = joinUrl(apiBaseUrl, resource);

  if (useMockApi) {
    const path = resource.startsWith('http') ? new URL(resource).pathname : resource;
    const normalized = path.startsWith(apiBaseUrl) ? path.slice(apiBaseUrl.length) || '/' : path;
    const route = mockRoutes.find((r) => r.test.test(normalized));
    if (route) return route.handler(normalized, { ...init, headers });
  }

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (response.status === 401) await clearAuth();
      message = data?.message || data?.error || message;
    } catch {}
    throw new Error(message);
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

