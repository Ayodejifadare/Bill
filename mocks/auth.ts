import crypto from 'crypto';

const TEST_SECRET = 'test-secret';

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(payload: Record<string, unknown>) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerSegment = base64url(JSON.stringify(header));
  const payloadSegment = base64url(JSON.stringify(payload));
  const signature = base64url(
    crypto
      .createHmac('sha256', TEST_SECRET)
      .update(`${headerSegment}.${payloadSegment}`)
      .digest(),
  );
  return `${headerSegment}.${payloadSegment}.${signature}`;
}

export function generateMockToken(phone: string) {
  const now = Math.floor(Date.now() / 1000);
  return sign({
    sub: 'demo-user',
    name: 'Demo User',
    phone,
    iat: now,
    exp: now + 7 * 24 * 60 * 60,
  });
}

export async function handle(path: string, init?: RequestInit) {
  const body = typeof init?.body === 'string' ? init.body : undefined;
  const data = body ? JSON.parse(body) : {};

  if (path === '/auth/request-otp') {
    return { message: 'OTP sent' };
  }

  if (path === '/auth/verify-otp') {
    return {
      token: generateMockToken(data.phone),
      user: {
        id: 'demo-user',
        name: 'Demo User',
        phone: data.phone,
      },
    };
  }

  throw new Error(`No mock handler for path: ${path}`);
}
