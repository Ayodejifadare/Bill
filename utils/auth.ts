const AUTH_KEY = "biltip_auth";
const USER_KEY = "biltip_user";

interface StoredAuth {
  token?: string;
  expiresAt?: number;
  [key: string]: unknown;
}

interface StoredUser {
  name?: string;
  [key: string]: unknown;
}

interface AuthStorageData {
  auth: StoredAuth;
  user: StoredUser;
}

export function saveAuth(data: AuthStorageData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(data.auth));
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function loadAuth(): AuthStorageData | null {
  if (typeof window === "undefined") return null;
  try {
    const authRaw = localStorage.getItem(AUTH_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    if (!authRaw || !userRaw) return null;
    return {
      auth: JSON.parse(authRaw) as StoredAuth,
      user: JSON.parse(userRaw) as StoredUser,
    };
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}
