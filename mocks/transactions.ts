// Mock handler for /api/transactions and /api/transactions/summary

function makeList() {
  const now = Date.now();
  return [
    {
      id: "tx-1001",
      type: "received",
      amount: 42.5,
      description: "Dinner split from Alice",
      recipient: { name: "You" },
      sender: { name: "Alice" },
      date: new Date(now - 3600_000).toISOString(),
      status: "completed",
    },
    {
      id: "tx-1002",
      type: "sent",
      amount: 18.0,
      description: "Coffee with Bob",
      recipient: { name: "Bob" },
      sender: { name: "You" },
      date: new Date(now - 7200_000).toISOString(),
      status: "completed",
    },
    {
      id: "tx-1003",
      type: "bill_split",
      amount: 30,
      description: "Ride share",
      recipient: { name: "Group" },
      date: new Date(now - 10800_000).toISOString(),
      status: "pending",
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
  return {
    transactions: makeList(),
    hasMore: false,
    nextCursor: null,
    total: 3,
    pageCount: 1,
  };
}
