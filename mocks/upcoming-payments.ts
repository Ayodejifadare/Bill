import type { UpcomingPayment } from "../hooks/useUpcomingPayments";

const today = new Date();
const d = (days: number) => new Date(today.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const upcomingPayments: UpcomingPayment[] = [
  {
    id: 'up-1',
    type: 'bill_split',
    title: "Dinner at Tony's Pizza",
    amount: -18.75,
    dueDate: d(1),
    organizer: { id: 'ed', name: 'Emily Davis', avatar: '' },
    status: 'pending',
    participants: 4,
  },
  {
    id: 'up-2',
    type: 'request',
    title: 'Movie tickets',
    amount: 35.0,
    dueDate: d(8),
    organizer: { id: 'dk', name: 'David Kim', avatar: '' },
    status: 'overdue',
    participants: 2,
  },
  {
    id: 'up-3',
    type: 'bill_split',
    title: 'Groceries from Whole Foods',
    amount: -45.0,
    dueDate: d(3),
    organizer: { id: 'sj', name: 'Sarah Johnson', avatar: '' },
    status: 'pending',
    participants: 4,
  },
];

export async function handle(_path: string, _init?: RequestInit) {
  return { upcomingPayments };
}
