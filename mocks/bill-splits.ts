// Mock handler for /bill-splits/* endpoints
import { formatBillDate } from "../utils/formatBillDate";

function makeBillSplit(id: string) {
  const createdAt = new Date().toISOString();
  const friendlyDate = formatBillDate(createdAt);
  return {
    id,
    title: "Mock Group Dinner",
    totalAmount: 120.0,
    yourShare: 40.0,
    status: "open",
    participants: [
      { name: "You", amount: 40, paid: false },
      { name: "Alice", amount: 40, paid: true },
      { name: "Bob", amount: 40, paid: false },
    ],
    createdBy: "Alice",
    date: createdAt,
    friendlyDate,
    paymentMethod: {
      type: "bank",
      bankName: "Mock Bank",
      accountHolderName: "You",
      accountNumber: "1234567890",
      sortCode: "044",
    },
    note: "Thanks for joining!",
  };
}

export async function handle(path: string, init?: RequestInit) {
  const payMatch = path.match(/^\/bill-splits\/([^/]+)\/payments$/);
  if (payMatch && init?.method === "POST") {
    return { success: true };
  }

  const getMatch = path.match(/^\/bill-splits\/([^/]+)$/);
  if (getMatch) {
    const id = getMatch[1];
    return { billSplit: makeBillSplit(id) };
  }

  // Not used, but return default
  return { billSplit: makeBillSplit("default") };
}
