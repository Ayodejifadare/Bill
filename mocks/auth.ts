export async function handle(path: string, init?: RequestInit) {
  const body = typeof init?.body === 'string' ? init.body : undefined;
  const data = body ? JSON.parse(body) : {};

  if (path === '/auth/request-otp') {
    return { message: 'OTP sent' };
  }

  if (path === '/auth/verify-otp') {
    return {
      token: 'mock-token',
      user: {
        id: 'demo-user',
        name: 'Demo User',
        phone: data.phone,
      },
    };
  }

  throw new Error(`No mock handler for path: ${path}`);
}
