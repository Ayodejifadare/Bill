import type { UpcomingPayment } from "../hooks/useUpcomingPayments";

const now = Date.now();

const upcomingPayments: UpcomingPayment[] = [
  {
    id: "1",
    type: "bill_split",
    title: "Dinner",
    amount: 45,
    dueDate: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    organizer: { id: "user_alice", name: "Alice", avatar: "" },
    status: "pending",
    participants: 3,
  },
  {
    id: "paylink-1",
    type: "pay_link",
    title: "Security deposit",
    amount: 150,
    dueDate: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
    organizer: {
      id: "user_jordan",
      name: "Jordan",
      avatar: "https://images.unsplash.com/photo-1529665253569-6d01c0eaf7b6?w=64&h=64&fit=crop",
    },
    status: "pending",
    participants: [],
    senderId: "user_jordan",
    receiverId: "mock-user",
    bankTransferInstructions: {
      type: "bank",
      bank: "Community Credit Union",
      accountName: "Jordan Smith",
      accountNumber: "28700192",
      sortCode: "04-00-04",
      routingNumber: "021000021",
    },
    payLinkToken: "demo-token",
    payLinkSlug: "security-deposit",
  },
  {
    id: "paylink-2",
    type: "pay_link",
    title: "Weekend getaway share",
    amount: 85,
    dueDate: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    organizer: {
      id: "user_avery",
      name: "Avery",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop",
    },
    status: "paid",
    participants: [],
    senderId: "user_avery",
    receiverId: "mock-user",
    bankTransferInstructions: {
      type: "mobile_money",
      provider: "M-Pesa",
      accountName: "Jordan Smith",
      phoneNumber: "+254700000000",
    },
    payLinkToken: "fulfilled-token",
    payLinkSlug: "weekend-getaway",
  },
];

export async function handle(_path: string, _init?: RequestInit) {
  return { upcomingPayments };
}
