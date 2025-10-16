// Mock handler for /api/transactions and /api/transactions/summary

function makeList() {
  const now = Date.now();
  return [
    {
      id: 'tx-2001',
      type: 'received',
      amount: 25.5,
      description: 'Coffee and lunch',
      sender: { name: 'Sarah Johnson' },
      recipient: { name: 'You' },
      date: new Date(now - 2 * 24 * 3600_000).toISOString(),
      status: 'completed',
    },
    {
      id: 'tx-2002',
      type: 'sent',
      amount: 45.0,
      description: 'Uber ride home',
      sender: { name: 'You' },
      recipient: { name: 'Mike Chen' },
      date: new Date(now - 3 * 24 * 3600_000).toISOString(),
      status: 'completed',
    },
    {
      id: 'tx-2003',
      type: 'received',
      amount: 60.0,
      description: 'Concert tickets',
      sender: { name: 'Alex Rodriguez' },
      recipient: { name: 'You' },
      date: new Date(now - 5 * 24 * 3600_000).toISOString(),
      status: 'completed',
    },
    {
      id: 'tx-2004',
      type: 'sent',
      amount: 12.5,
      description: 'Coffee',
      sender: { name: 'You' },
      recipient: { name: 'Jessica Lee' },
      date: new Date(now - 6 * 24 * 3600_000).toISOString(),
      status: 'completed',
    },
  ];
}

export async function handle(path: string, _init?: RequestInit) {
  if (path.startsWith("/api/transactions/summary")) {
    return {
      totalSent: 120.0,
      totalReceived: 210.75,
      netFlow: 90.75,
    };
  }

  const match = path.match(/^\/api\/transactions\/(.+)$/);
  if (match) {
    const id = match[1];
    // Return a wrapper so TransactionDetailsScreen can map data.transaction || data
    return {
      transaction: {
        id,
        type: "sent",
        amount: 25.0,
        description: "Mock transaction",
        recipient: { name: "Charlie" },
        sender: { name: "You" },
        date: new Date().toISOString(),
        status: "completed",
      },
    };
  }

  // Default list
  const list = makeList();
  return { transactions: list, hasMore: false, nextCursor: null, total: list.length, pageCount: 1 };
}
