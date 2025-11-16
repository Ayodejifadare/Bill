import type { UpcomingPayment } from "../hooks/useUpcomingPayments";

const upcomingPayments: UpcomingPayment[] = [
  {
    id: "1",
    type: "bill_split",
    title: "Dinner",
    amount: 45,
    dueDate: new Date().toISOString(),
    organizer: { id: "user_alice", name: "Alice", avatar: "" },
    status: "pending",
    participants: 3,
  },
  {
    id: "paylink-1",
    type: "pay_link",
    title: "Security deposit",
    amount: 150,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    organizer: { id: "user_jordan", name: "Jordan", avatar: "" },
    status: "pending",
    participants: [],
    senderId: "user_jordan",
    receiverId: "mock-user",
    bankTransferInstructions: {
      type: "bank",
      bank: "Mock Bank",
      accountName: "Jordan Smith",
      accountNumber: "123456789",
      sortCode: "00-00-00",
    },
    payLinkToken: "demo-token",
  },
];

export async function handle(_path: string, _init?: RequestInit) {
  return { upcomingPayments };
}
