import { apiBaseUrl, useMockApi, useDevAuth, devUserId } from "./config";
import { handle as mockFriends } from "../mocks/friends";
import { handle as mockGroups } from "../mocks/groups";
import { handle as mockUpcomingPayments } from "../mocks/upcoming-payments";
import { handle as mockRequests } from "../mocks/requests";
import { handle as mockTransactions } from "../mocks/transactions";
import { handle as mockNotifications } from "../mocks/notifications";
import { handle as mockBillSplits } from "../mocks/bill-splits";
import { handle as mockAuth } from "../mocks/auth";
import { handle as mockUsers } from "../mocks/users";
import { handle as mockContacts } from "../mocks/contacts";
import { clearAuth } from "./auth";
import { clearBiometricCredential } from "./biometric-storage";

type MockHandler = (path: string, init?: RequestInit) => Promise<any>;

const mockRoutes: Array<{ test: RegExp; handler: MockHandler }> = [
  { test: /^\/contacts/, handler: mockContacts },
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

let cachedAuthString: string | null | undefined;
let cachedToken: string | null = null;
let cachedUserString: string | null | undefined;
let cachedUserId: string | null = null;

function resetAuthCache() {
  cachedAuthString = undefined;
  cachedToken = null;
  cachedUserString = undefined;
  cachedUserId = null;
}

function readAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const authString = window.localStorage.getItem("biltip_auth");
  if (authString === cachedAuthString) {
    return cachedToken;
  }

  cachedAuthString = authString;
  if (!authString) {
    cachedToken = null;
    return null;
  }

  try {
    const parsed = JSON.parse(authString);
    cachedToken = typeof parsed?.token === "string" ? parsed.token : null;
  } catch {
    cachedToken = null;
  }

  return cachedToken;
}

function readStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  const userString = window.localStorage.getItem("biltip_user");
  if (userString === cachedUserString) {
    return cachedUserId;
  }

  cachedUserString = userString;
  if (!userString) {
    cachedUserId = null;
    return null;
  }

  try {
    const parsed = JSON.parse(userString);
    cachedUserId = parsed?.id ? String(parsed.id) : null;
  } catch {
    cachedUserId = null;
  }

  return cachedUserId;
}

function joinUrl(base: string, resource: string): string {
  // Absolute resource wins
  if (/^https?:\/\//i.test(resource)) return resource;

  // Normalize base (remove trailing slashes)
  const baseNorm = (base || "").replace(/\/+$/, "");

  // If base is absolute, preserve its pathname when joining
  const isAbsoluteBase = /^https?:\/\//i.test(baseNorm);
  if (isAbsoluteBase) {
    const u = new URL(baseNorm);
    const basePath = u.pathname.replace(/\/+$/, "");
    const baseHasApi = /(^|\/)api(\/|$)/.test(basePath);
    // Ensure resource has a leading slash
    let resPath = resource.startsWith("/") ? resource : `/${resource}`;
    // If base path doesn't include '/api' and resource doesn't start with it, prefix '/api'
    if (!baseHasApi && !resPath.startsWith("/api/")) {
      resPath = `/api${resPath}`;
    }
    // If resource already includes the basePath prefix, avoid duplicating it
    const finalPath =
      resPath.startsWith(basePath + "/") || resPath === basePath
        ? resPath
        : `${basePath}${resPath}`;
    return `${u.origin}${finalPath}`;
  }

  // Relative base (e.g., '/api'): ensure exactly one slash between base and resource
  // If resource already starts with '/api', avoid duplicating when base is also '/api'.
  if (resource.startsWith("/api/")) {
    return resource.replace(/\/{2,}/g, "/");
  }
  const left = baseNorm || "";
  const right = resource.replace(/^\/+/, "");
  const joined = `${left}/${right}`;
  // Collapse multiple slashes in the path (but leave protocol intact — not applicable here)
  return joined.replace(/\/{2,}/g, "/");
}

export async function apiClient(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const token = readAuthToken();

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  // token is expected to be a JWT (three base64url segments)
  // Only attach the Authorization header for syntactically valid JWTs.
  // Dev auth should be handled via `useDevAuth` (x-user-id) instead.
  const tokenIsValid =
    typeof token === "string" &&
    /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token);

  // Reduce console noise during development to improve startup performance

  if (tokenIsValid) {
    headers["Authorization"] = `Bearer ${token}`;
    // Authorization header attached
  } else {
    if (token) {
      console.warn("Invalid auth token, Authorization header omitted");
      clearAuth();
      clearBiometricCredential();
      resetAuthCache();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("session-expired"));
      }
    }
  }

  // Dev-mode auth bypass using backend's x-user-id hook
  if (!headers["Authorization"] && useDevAuth) {
    // Prefer explicit env user id, else fall back to stored user id
    const xUserId = devUserId || readStoredUserId();
    if (xUserId) {
      headers["x-user-id"] = xUserId;
    }
    // x-user-id header appended for dev auth
  }

  const resource =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.pathname + input.search
        : String(input);
  const url = joinUrl(apiBaseUrl, resource);

  if (useMockApi) {
    const path = resource.startsWith("http")
      ? new URL(resource).pathname
      : resource;
    const normalized = path.startsWith(apiBaseUrl)
      ? path.slice(apiBaseUrl.length) || "/"
      : path;
    const route = mockRoutes.find((r) => r.test.test(normalized));
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
      if (response.status === 403 && data?.error === "onboarding_required") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("onboarding-required", { detail: data }),
          );
        }
      }
      // If server says we're unauthorized, clear auth and notify app
      if (response.status === 401) {
        clearAuth();
        clearBiometricCredential();
        resetAuthCache();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("session-expired"));
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
