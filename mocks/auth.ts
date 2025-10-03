export async function handle(path: string, init?: RequestInit) {
  const body = typeof init?.body === 'string' ? init.body : undefined;
  const data = body ? JSON.parse(body) : {};

  // Use a syntactically valid JWT string to satisfy client-side token checks
  const demoJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJ1c2VySWQiOiJkZW1vLXVzZXIiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDk5OTk5OTk5fQ.' +
    'dGVzdF9zaWduYXR1cmU';

  if (path === '/auth/request-otp') {
    // Include an OTP in mock to improve DX
    return { message: 'OTP sent', otp: '123456' };
  }

  if (path === '/auth/verify-otp') {
    // Accept provided OTP or the demo OTP; return a demo JWT
    const providedOtp = String(data?.otp ?? '');
    if (providedOtp && providedOtp !== '123456') {
      // Simulate invalid OTP
      throw new Error('Invalid or expired OTP');
    }
    return {
      token: demoJwt,
      user: {
        id: 'demo-user',
        name: 'Demo User',
        phone: data.phone,
        email: data.email || 'demo@example.com',
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (path === '/auth/register') {
    // Echo back a created user and token to mirror server shape
    const firstName = String(data?.firstName || 'Demo');
    const lastName = String(data?.lastName || 'User');
    const name = `${firstName} ${lastName}`.trim();
    const phone = String(data?.phone || '+15550000000');
    const email = String(data?.email || 'demo@example.com');
    return {
      message: 'User created successfully',
      user: {
        id: 'mock-user-id',
        email,
        name,
        firstName,
        lastName,
        phone,
        balance: 0,
        createdAt: new Date().toISOString(),
        phoneVerified: false,
        emailVerified: false,
        idVerified: false,
        documentsSubmitted: false,
        onboardingCompleted: true,
      },
      token: demoJwt,
    };
  }

  if (path === '/auth/logout') {
    return { message: 'Logged out' };
  }

  throw new Error(`No mock handler for path: ${path}`);
}
