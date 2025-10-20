// Mock handler for /bill-splits/* endpoints
import { formatBillDate } from "../utils/formatBillDate";

function makeBillSplit(id: string) {
  const createdAt = new Date().toISOString();
  const friendlyDate = formatBillDate(createdAt);
  const creatorId = "me";
  return {
    id,
    title: "Mock Group Dinner",
    totalAmount: 120.0,
    yourShare: 40.0,
    status: "pending",
    participants: [
      { userId: "me", name: "You", amount: 40, paid: false },
      { userId: "u_alice", name: "Alice", amount: 40, paid: true },
      { userId: "u_bob", name: "Bob", amount: 40, paid: false },
    ],
    createdBy: "You",
    creatorId,
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

  const confirmMatch = path.match(/^\/bill-splits\/([^/]+)\/confirm-payment$/);
  if (confirmMatch && init?.method === "POST") {
    // Simulate marking participant as paid and return progress summary
    try {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const participantUserId: string | undefined = body?.participantUserId;
      const bill = makeBillSplit(confirmMatch[1]);
      const updatedParticipants = bill.participants.map((p: any) =>
        participantUserId && p.userId === participantUserId
          ? { ...p, paid: true }
          : p,
      );
      const paidCount = updatedParticipants.filter((p: any) => p.paid).length;
      const totalCount = updatedParticipants.length;
      const totalPaid = updatedParticipants
        .filter((p: any) => p.paid)
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      return {
        message: "Payment confirmed",
        progress: { paidCount, totalCount, totalPaid },
      };
    } catch {
      return { message: "Payment confirmed", progress: { paidCount: 0, totalCount: 0, totalPaid: 0 } };
    }
  }

  const getMatch = path.match(/^\/bill-splits\/([^/]+)$/);
  if (getMatch) {
    const id = getMatch[1];
    return { billSplit: makeBillSplit(id) };
  }

  // Not used, but return default
  return { billSplit: makeBillSplit("default") };
}
