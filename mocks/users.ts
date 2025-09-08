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
  // Support both /users/* and /api/users/*
  if (/^\/(api\/)?users\/[^/]+\/stats$/.test(path)) {
    return { stats: demoStats };
  }

  if (/^\/(api\/)?users\/[^/]+\/payment-methods$/.test(path)) {
    const parts = path.split('/');
    const id = parts[parts.length - 2];
    return [
      {
        id: 'pm-bank-1',
        type: 'bank',
        bankName: 'Mock Bank',
        accountHolderName: 'Demo User',
        accountNumber: '1234567890',
        sortCode: '044',
        isDefault: true,
      },
      {
        id: 'pm-mm-1',
        type: 'mobile_money',
        provider: 'Opay',
        phoneNumber: '+2348012345678',
        isDefault: false,
      },
    ];
  }

  if (/^\/(api\/)?users\/[^/]+$/.test(path)) {
    const parts = path.split('/');
    const id = parts[parts.length - 1];
    return { user: { ...demoProfile, id } };
  }

  return null;
}
