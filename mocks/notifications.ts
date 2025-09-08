// Mock handler for /api/notifications/* (unread count)

export async function handle(path: string, _init?: RequestInit) {
  if (path.startsWith('/api/notifications/unread')) {
    return { count: 2 };
  }
  // SSE stream cannot be mocked via fetch; return a harmless payload
  if (path.startsWith('/api/notifications/stream')) {
    return null;
  }
  return { count: 0 };
}

