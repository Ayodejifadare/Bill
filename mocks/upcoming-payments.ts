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
];

export async function handle(_path: string, _init?: RequestInit) {
  return { upcomingPayments };
}
