// Demo profile data
const demoProfile = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@example.com',
  createdAt: new Date().toISOString(),
  kycStatus: 'verified' as const,
};

const demoStats = {
  totalSent: 1200,
  totalReceived: 800,
  totalSplits: 5,
  friends: 10,
};

export async function handle(path: string, _init?: RequestInit) {
  if (/^\/users\/[^/]+\/stats$/.test(path)) {
    return { stats: demoStats };
  }

  if (/^\/users\/[^/]+$/.test(path)) {
    const id = path.split('/')[2];
    return { user: { ...demoProfile, id } };
  }

  return null;
}
