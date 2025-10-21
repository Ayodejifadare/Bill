import express from "express";
import authenticate from "../middleware/auth.js";

const router = express.Router();

export function classifyStatus(dueDate) {
  const now = new Date();
  const date = new Date(dueDate);
  const graceMs = 24 * 60 * 60 * 1000; // 24-hour grace period for recent items
  const soonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Treat items that are today or up to 24h past due as pending (due_soon)
  if (date < now && date >= new Date(now.getTime() - graceMs)) {
    return "due_soon";
  }

  if (date < now) return "overdue";
  if (date <= soonThreshold) return "due_soon";
  return "upcoming";
}

router.get("/upcoming-payments", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const billParticipants = await req.prisma.billSplitParticipant.findMany({
      where: { userId, isPaid: false },
      include: {
        billSplit: {
          include: {
            creator: {
              select: { id: true, name: true, email: true, avatar: true },
            },
            participants: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatar: true },
                },
              },
            },
          },
        },
      },
    });

    const billPayments = billParticipants.map((p) => {
      const dueDate = p.billSplit.date || p.billSplit.createdAt;
      return {
        id: p.id,
        type: "bill_split",
        title: p.billSplit.title,
        amount: p.amount,
        dueDate: dueDate.toISOString(),
        status: classifyStatus(dueDate),
        organizer: p.billSplit.creator,
        participants: p.billSplit.participants.map((part) => ({
          id: part.user.id,
          name: part.user.name,
          email: part.user.email,
          avatar: part.user.avatar,
          amount: part.amount,
          isPaid: part.isPaid,
        })),
        billSplitId: p.billSplitId,
        paymentMethod: p.billSplit.paymentMethodId || null,
      };
    });

    // As creator: include bill splits where you've already paid your share
    // but other participants are still unpaid. Keep them in the Pending view
    // so you can settle funds or remind others.
    const createdUnsettled = await req.prisma.billSplit.findMany({
      where: {
        createdBy: userId,
        // creator's own participant has paid
        participants: {
          some: { userId, isPaid: true },
        },
        // at least one other participant still unpaid
        AND: [
          {
            participants: {
              some: { isPaid: false },
            },
          },
        ],
      },
      include: {
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
    });

    const creatorPayments = createdUnsettled.map((split) => {
      const dueDate = split.date || split.createdAt;
      const outstanding = split.participants
        .filter((part) => !part.isPaid)
        .reduce((sum, part) => sum + (Number(part.amount) || 0), 0);
      return {
        id: split.id,
        type: "bill_split",
        title: split.title,
        // For creators, show total outstanding amount remaining to collect
        amount: outstanding,
        dueDate: new Date(dueDate).toISOString(),
        status: classifyStatus(dueDate),
        organizer: split.creator,
        participants: split.participants.map((part) => ({
          id: part.user.id,
          name: part.user.name,
          email: part.user.email,
          avatar: part.user.avatar,
          amount: part.amount,
          isPaid: part.isPaid,
        })),
        billSplitId: split.id,
        paymentMethod: split.paymentMethodId || null,
        isCreator: true,
      };
    });

    // Accepted request transactions are not included; users pay direct requests without acceptance.

    // Direct pending payment requests (before acceptance)
    const direct = await req.prisma.paymentRequest.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    const directRequestPayments = direct.map((r) => {
      const dueDate = r.nextDueDate || r.createdAt;
      return {
        id: r.id,
        type: "request",
        title: r.description || "Payment Request",
        amount: r.amount,
        dueDate: dueDate.toISOString(),
        status: classifyStatus(dueDate),
        organizer: r.sender,
        senderId: r.sender.id,
        receiverId: r.receiver.id,
        participants: [r.sender, r.receiver],
        // No transaction exists yet; pass null so payment flow won’t call mark-sent
        requestId: null,
        paymentMethod: null,
      };
    });

    // Direct pending requests created by current user (sender)
    const directSent = await req.prisma.paymentRequest.findMany({
      where: { senderId: userId, status: "PENDING" },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    const directRequestPaymentsSent = directSent.map((r) => {
      const dueDate = r.nextDueDate || r.createdAt;
      return {
        id: r.id,
        type: "request",
        title: r.description || "Payment Request",
        amount: r.amount,
        dueDate: dueDate.toISOString(),
        status: classifyStatus(dueDate),
        // For direct pending requests you created (no transaction yet), also show receiver as organizer
        organizer: r.receiver,
        senderId: r.sender.id,
        receiverId: r.receiver.id,
        participants: [r.sender, r.receiver],
        requestId: null,
        paymentMethod: null,
      };
    });

    let payments = [
      ...billPayments,
      ...creatorPayments,
      ...directRequestPayments,
      ...directRequestPaymentsSent,
    ];
    // Deduplicate potential overlaps for requests (edge cases during state transitions)
    const seen = new Set();
    payments = payments.filter((p) => {
      if (p.type !== "request") return true;
      const ids = Array.isArray(p.participants)
        ? p.participants.map((x) => x?.id).filter(Boolean).sort().join(",")
        : "";
      const key = `${p.type}|${ids}|${p.amount}|${p.status}|${p.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const { filter } = req.query;
    if (filter) {
      payments = payments.filter((p) => p.status === filter);
    }

    // Sort by recency (most recent first) using dueDate as canonical timestamp
    payments.sort((a, b) => {
      const ad = new Date(a.dueDate).getTime();
      const bd = new Date(b.dueDate).getTime();
      return bd - ad;
    });

    res.json({ upcomingPayments: payments });
  } catch (error) {
    console.error("Get upcoming payments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
