import express from "express";
import {
  TRANSACTION_TYPE_MAP,
  TRANSACTION_STATUS_MAP,
} from "../../shared/transactions.js";
import authenticate from "../middleware/auth.js";
import { requireGroupMember } from "../utils/permissions.js";

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(requireGroupMember);

// GET /transactions?page=1 - list transactions for group
router.get("/transactions", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    const members = await req.prisma.groupMember.findMany({
      where: { groupId: req.params.groupId },
    });
    const memberIds = members.map((m) => m.userId);

    const scope = String(req.query.scope || "my").toLowerCase();
    const whereBase = {
      OR: [
        { senderId: { in: memberIds } },
        { receiverId: { in: memberIds } },
      ],
    };

    const where =
      scope === "group"
        ? whereBase // show all group transactions
        : {
            ...whereBase,
            AND: [
              { OR: [{ senderId: req.userId }, { receiverId: req.userId }] },
              // Exclude self-referential entries (payer's own share) for cleaner activity
              {
                NOT: {
                  AND: [{ senderId: req.userId }, { receiverId: req.userId }],
                },
              },
            ],
          };

    const transactions = await req.prisma.transaction.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    });
    const hasMore = transactions.length > pageSize;
    const slice = transactions.slice(0, pageSize);

    const formatted = slice.map((t) => ({
      id: t.id,
      billSplitId: t.billSplitId || null,
      type: TRANSACTION_TYPE_MAP[t.type] || t.type,
      amount: t.amount,
      description: t.description || "",
      date: t.createdAt.toISOString(),
      status: TRANSACTION_STATUS_MAP[t.status] || t.status,
      paidBy: t.sender?.name || t.senderId,
      participants: [
        t.sender?.name || t.senderId,
        t.receiver?.name || t.receiverId,
      ],
    }));
    // Response: { transactions: Transaction[], page, pageSize, hasMore }
    res.json({ page, pageSize, hasMore, transactions: formatted });
  } catch (error) {
    console.error("List group transactions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /split-bill - create a bill split transaction
router.post("/split-bill", async (req, res) => {
  try {
    const { amount, description = "", participants } = req.body || {};

    if (amount === undefined || isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ error: "Amount is required and must be a positive number" });
    }

    // Ensure group exists and get members
    const group = await req.prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: { members: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const memberIds = group.members.map((m) => m.userId);

    const payerId = req.user.id;
    let participantIds;
    if (participants === undefined) {
      participantIds = memberIds.filter((id) => id !== payerId);
    } else {
      if (!Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({
          error:
            "Participants must be a non-empty array of user IDs or omitted",
        });
      }
      participantIds = participants;
    }

    const allParticipants = participantIds.includes(payerId)
      ? participantIds
      : [payerId, ...participantIds];

    // Verify all participants are members of the group
    const invalid = allParticipants.find((id) => !memberIds.includes(id));
    if (invalid) {
      return res.status(400).json({ error: "Invalid participant" });
    }

    const share = amount / allParticipants.length;

    const txs = await req.prisma.$transaction(async (prisma) => {
      // Create bill split record
      const billSplit = await prisma.billSplit.create({
        data: {
          title: description || "Group bill split",
          description,
          totalAmount: amount,
          createdBy: payerId,
          groupId: req.params.groupId,
        },
      });

      // Participants including payer (paid true for payer)
      await prisma.billSplitParticipant.createMany({
        data: allParticipants.map((id) => ({
          billSplitId: billSplit.id,
          userId: id,
          amount: share,
          isPaid: id === payerId,
        })),
      });

      // Create transactions for each participant (including payer for total spent)
      const created = [];
      for (const id of allParticipants) {
        const tx = await prisma.transaction.create({
          data: {
            senderId: payerId,
            receiverId: id,
            amount: share,
            type: "BILL_SPLIT",
            status: id === payerId ? "COMPLETED" : "PENDING",
            description,
            billSplitId: billSplit.id,
          },
          include: {
            sender: { select: { id: true, name: true } },
            receiver: { select: { id: true, name: true } },
          },
        });
        created.push(tx);
      }

      return created;
    });

    // Choose a transaction involving another participant to return
    const tx = txs.find((t) => t.receiverId !== payerId) || txs[0];
    const formatted = {
      id: tx.id,
      type: TRANSACTION_TYPE_MAP[tx.type] || tx.type,
      amount: tx.amount,
      description: tx.description || "",
      date: tx.createdAt.toISOString(),
      status: TRANSACTION_STATUS_MAP[tx.status] || tx.status,
      paidBy: tx.sender?.name || tx.senderId,
      participants: [
        tx.sender?.name || tx.senderId,
        tx.receiver?.name || tx.receiverId,
      ],
    };

    res.status(201).json({ transaction: formatted });
  } catch (error) {
    console.error("Split bill error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
