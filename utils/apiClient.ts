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
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(input, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
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
