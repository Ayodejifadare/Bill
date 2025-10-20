import express from "express";
import { body, validationResult } from "express-validator";
import {
  TRANSACTION_TYPE_MAP,
  TRANSACTION_STATUS_MAP,
  TRANSACTION_CATEGORY_MAP,
} from "../../shared/transactions.js";
import { createNotification } from "../utils/notifications.js";
import authenticate from "../middleware/auth.js";

// Build reverse lookup maps for filters
const REVERSE_TRANSACTION_TYPE_MAP = Object.fromEntries(
  Object.entries(TRANSACTION_TYPE_MAP).map(([key, value]) => [value, key]),
);
const REVERSE_TRANSACTION_STATUS_MAP = Object.fromEntries(
  Object.entries(TRANSACTION_STATUS_MAP).map(([key, value]) => [value, key]),
);
const REVERSE_TRANSACTION_CATEGORY_MAP = Object.fromEntries(
  Object.entries(TRANSACTION_CATEGORY_MAP).map(([key, value]) => [value, key]),
);

const router = express.Router();

router.use(authenticate);

// Lightweight counts endpoint to avoid multiple list calls on home
router.get("/counts", async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      category,
      minAmount,
      maxAmount,
      keyword,
    } = req.query;

    const baseWhere = {};

    if (startDate || endDate) {
      baseWhere.createdAt = {};
      if (startDate) baseWhere.createdAt.gte = new Date(startDate);
      if (endDate) baseWhere.createdAt.lte = new Date(endDate);
    }

    if (status) {
      const mappedStatus = REVERSE_TRANSACTION_STATUS_MAP[status] || status;
      baseWhere.status = mappedStatus;
    }

    if (category) {
      const mappedCategory =
        REVERSE_TRANSACTION_CATEGORY_MAP[category] || category;
      baseWhere.category = mappedCategory;
    }

    if (minAmount || maxAmount) {
      baseWhere.amount = {};
      if (minAmount) baseWhere.amount.gte = parseFloat(minAmount);
      if (maxAmount) baseWhere.amount.lte = parseFloat(maxAmount);
    }

    if (keyword) {
      const keywordFilter = {
        OR: [
          { description: { contains: keyword, mode: "insensitive" } },
          { billSplit: { title: { contains: keyword, mode: "insensitive" } } },
          {
            billSplit: {
              description: { contains: keyword, mode: "insensitive" },
            },
          },
          { sender: { name: { contains: keyword, mode: "insensitive" } } },
          { receiver: { name: { contains: keyword, mode: "insensitive" } } },
        ],
      };
      baseWhere.AND = Array.isArray(baseWhere.AND)
        ? [...baseWhere.AND, keywordFilter]
        : [keywordFilter];
    }

    const totalWhere = {
      ...baseWhere,
      OR: [{ senderId: req.userId }, { receiverId: req.userId }],
    };

    const sentWhere = {
      ...baseWhere,
      senderId: req.userId,
    };

    const receivedWhere = {
      ...baseWhere,
      receiverId: req.userId,
    };

    const [total, sent, received] = await req.prisma.$transaction([
      req.prisma.transaction.count({ where: totalWhere }),
      req.prisma.transaction.count({ where: sentWhere }),
      req.prisma.transaction.count({ where: receivedWhere }),
    ]);

    res.json({ total, sent, received });
  } catch (error) {
    console.error("Get transaction counts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get distinct transaction categories for the current user
router.get("/categories", async (req, res) => {
  try {
    const categories = await req.prisma.transaction.findMany({
      where: {
        OR: [{ senderId: req.userId }, { receiverId: req.userId }],
        category: { not: null },
      },
      distinct: ["category"],
      select: { category: true },
    });

    const mapped = categories
      .map((c) => TRANSACTION_CATEGORY_MAP[c.category] || c.category)
      .filter(Boolean);

    res.json({ categories: mapped });
  } catch (error) {
    console.error("Get transaction categories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's transactions
router.get("/", async (req, res) => {
  try {
    const {
      cursor,
      limit,
      page,
      size,
      startDate,
      endDate,
      type,
      status,
      category,
      minAmount,
      maxAmount,
      keyword,
      includeSummary,
    } = req.query;

    const baseWhere = {};

    if (startDate || endDate) {
      baseWhere.createdAt = {};
      if (startDate) baseWhere.createdAt.gte = new Date(startDate);
      if (endDate) baseWhere.createdAt.lte = new Date(endDate);
    }

    // Interpret type filter with user perspective so confirmed payments appear as "received" for the receiver
    let perspectiveFilter = null;
    if (type) {
      if (String(type).toLowerCase() === "received") {
        // Show items where current user is the receiver; underlying DB type may still be SEND
        perspectiveFilter = { receiverId: req.userId };
        // Do not constrain by underlying type so SEND/RECEIVE both match
      } else if (String(type).toLowerCase() === "sent") {
        // Show items where current user is the sender
        perspectiveFilter = { senderId: req.userId };
        baseWhere.type = REVERSE_TRANSACTION_TYPE_MAP["sent"] || "SEND";
      } else {
        const mappedType = REVERSE_TRANSACTION_TYPE_MAP[type] || type;
        baseWhere.type = mappedType;
      }
    }

    if (status) {
      const mappedStatus = REVERSE_TRANSACTION_STATUS_MAP[status] || status;
      baseWhere.status = mappedStatus;
    }

    if (category) {
      const mappedCategory =
        REVERSE_TRANSACTION_CATEGORY_MAP[category] || category;
      baseWhere.category = mappedCategory;
    }

    if (minAmount || maxAmount) {
      baseWhere.amount = {};
      if (minAmount) baseWhere.amount.gte = parseFloat(minAmount);
      if (maxAmount) baseWhere.amount.lte = parseFloat(maxAmount);
    }

    if (keyword) {
      const keywordFilter = {
        OR: [
          { description: { contains: keyword, mode: "insensitive" } },
          { billSplit: { title: { contains: keyword, mode: "insensitive" } } },
          {
            billSplit: {
              description: { contains: keyword, mode: "insensitive" },
            },
          },
          { sender: { name: { contains: keyword, mode: "insensitive" } } },
          { receiver: { name: { contains: keyword, mode: "insensitive" } } },
        ],
      };
      baseWhere.AND = Array.isArray(baseWhere.AND)
        ? [...baseWhere.AND, keywordFilter]
        : [keywordFilter];
    }

    const where = {
      ...baseWhere,
      ...(perspectiveFilter || { OR: [{ senderId: req.userId }, { receiverId: req.userId }] }),
    };

    const baseQuery = {
      where,
      select: {
        id: true,
        amount: true,
        description: true,
        status: true,
        type: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        senderId: true,
        receiverId: true,
        billSplitId: true,
        sender: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    };

    let transactions;
    let nextCursor = null;
    let hasMore = false;
    let total = 0;
    let pageCount = 0;

    const isPageBased = page !== undefined || size !== undefined;
    if (isPageBased) {
      const pageNum = parseInt(page) || 1;
      const pageSize = parseInt(size) || parseInt(limit) || 20;

      const [totalCount, result] = await req.prisma.$transaction([
        req.prisma.transaction.count({ where }),
        req.prisma.transaction.findMany({
          ...baseQuery,
          skip: (pageNum - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      transactions = result;
      total = totalCount;
      pageCount = Math.ceil(total / pageSize);
      hasMore = pageNum < pageCount;
    } else {
      const pageSize = parseInt(limit) || parseInt(size) || 20;

      const result = await req.prisma.transaction.findMany({
        ...baseQuery,
        take: pageSize + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      transactions = result;

      if (transactions.length > pageSize) {
        const nextItem = transactions.pop();
        nextCursor = nextItem.id;
        hasMore = true;
      }

      total = await req.prisma.transaction.count({ where });
      pageCount = Math.ceil(total / pageSize);
    }

    const formatted = transactions.map(({ createdAt, receiver, ...t }) => {
      let mappedType = TRANSACTION_TYPE_MAP[t.type] || t.type;
      if (mappedType === "sent" || mappedType === "received") {
        mappedType = t.senderId === req.userId ? "sent" : "received";
      }
      return {
        ...t,
        date: createdAt.toISOString(),
        recipient: receiver,
        type: mappedType,
        status: TRANSACTION_STATUS_MAP[t.status] || t.status,
        ...(t.category
          ? { category: TRANSACTION_CATEGORY_MAP[t.category] || t.category }
          : {}),
      };
    });
    let summaryData = {};
    if (includeSummary === "true" || includeSummary === "1") {
      const completedStatus =
        REVERSE_TRANSACTION_STATUS_MAP["completed"] || "COMPLETED";

      const sentWhere = {
        ...baseWhere,
        senderId: req.userId,
        ...(status ? {} : { status: completedStatus }),
      };

      const receivedWhere = {
        ...baseWhere,
        receiverId: req.userId,
        ...(status ? {} : { status: completedStatus }),
      };

      const [sentAgg, receivedAgg] = await req.prisma.$transaction([
        req.prisma.transaction.aggregate({
          where: sentWhere,
          _sum: { amount: true },
        }),
        req.prisma.transaction.aggregate({
          where: receivedWhere,
          _sum: { amount: true },
        }),
      ]);

      const totalSent = sentAgg._sum.amount || 0;
      const totalReceived = receivedAgg._sum.amount || 0;

      summaryData = {
        totalSent,
        totalReceived,
        netFlow: totalReceived - totalSent,
      };
    }

    res.json({
      transactions: formatted,
      nextCursor,
      hasMore,
      total,
      pageCount,
      ...summaryData,
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get transaction summary
router.get("/summary", async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type,
      status,
      category,
      minAmount,
      maxAmount,
      keyword,
    } = req.query;

    const baseWhere = {};

    if (startDate || endDate) {
      baseWhere.createdAt = {};
      if (startDate) baseWhere.createdAt.gte = new Date(startDate);
      if (endDate) baseWhere.createdAt.lte = new Date(endDate);
    }

    if (type) {
      const mappedType = REVERSE_TRANSACTION_TYPE_MAP[type] || type;
      baseWhere.type = mappedType;
    }

    if (status) {
      const mappedStatus = REVERSE_TRANSACTION_STATUS_MAP[status] || status;
      baseWhere.status = mappedStatus;
    }

    if (category) {
      const mappedCategory =
        REVERSE_TRANSACTION_CATEGORY_MAP[category] || category;
      baseWhere.category = mappedCategory;
    }

    if (minAmount || maxAmount) {
      baseWhere.amount = {};
      if (minAmount) baseWhere.amount.gte = parseFloat(minAmount);
      if (maxAmount) baseWhere.amount.lte = parseFloat(maxAmount);
    }

    if (keyword) {
      const keywordFilter = {
        OR: [
          { description: { contains: keyword, mode: "insensitive" } },
          { billSplit: { title: { contains: keyword, mode: "insensitive" } } },
          {
            billSplit: {
              description: { contains: keyword, mode: "insensitive" },
            },
          },
          { sender: { name: { contains: keyword, mode: "insensitive" } } },
          { receiver: { name: { contains: keyword, mode: "insensitive" } } },
        ],
      };
      baseWhere.AND = Array.isArray(baseWhere.AND)
        ? [...baseWhere.AND, keywordFilter]
        : [keywordFilter];
    }

    const completedStatus =
      REVERSE_TRANSACTION_STATUS_MAP["completed"] || "COMPLETED";

    const sentWhere = {
      ...baseWhere,
      senderId: req.userId,
      ...(status ? {} : { status: completedStatus }),
    };

    const receivedWhere = {
      ...baseWhere,
      receiverId: req.userId,
      ...(status ? {} : { status: completedStatus }),
    };

    const [sentAgg, receivedAgg] = await req.prisma.$transaction([
      req.prisma.transaction.aggregate({
        where: sentWhere,
        _sum: { amount: true },
      }),
      req.prisma.transaction.aggregate({
        where: receivedWhere,
        _sum: { amount: true },
      }),
    ]);

    const totalSent = sentAgg._sum.amount || 0;
    const totalReceived = receivedAgg._sum.amount || 0;

    res.json({
      totalSent,
      totalReceived,
      netFlow: totalReceived - totalSent,
    });
  } catch (error) {
    console.error("Get transactions summary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single transaction
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await req.prisma.transaction.findUnique({
      where: { id },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        billSplit: {
          include: { participants: true },
        },
      },
    });

    if (
      !transaction ||
      (transaction.senderId !== req.userId &&
        transaction.receiverId !== req.userId)
    ) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    let paymentMethod = null;
    if (transaction.billSplit?.paymentMethodId) {
      const pm = await req.prisma.paymentMethod.findUnique({
        where: { id: transaction.billSplit.paymentMethodId },
      });
      if (pm) {
        paymentMethod = {
          type: pm.type,
          bankName: pm.bank,
          accountNumber: pm.accountNumber,
          accountHolderName: pm.accountName,
          sortCode: pm.sortCode,
          routingNumber: pm.routingNumber,
          accountType: pm.accountType,
          provider: pm.provider,
          phoneNumber: pm.phoneNumber,
        };
      }
    }

    let type = TRANSACTION_TYPE_MAP[transaction.type] || transaction.type;
    if (type === "sent" || type === "received") {
      type = transaction.senderId === req.userId ? "sent" : "received";
    }

    const otherUser =
      transaction.senderId === req.userId
        ? transaction.receiver
        : transaction.sender;

    const formatted = {
      id: transaction.id,
      amount: transaction.amount,
      description: transaction.description || "",
      date: transaction.createdAt.toISOString(),
      type,
      status: TRANSACTION_STATUS_MAP[transaction.status] || transaction.status,
      sender: transaction.sender,
      recipient: transaction.receiver,
      user: otherUser,
      ...(transaction.category
        ? {
            category:
              TRANSACTION_CATEGORY_MAP[transaction.category] ||
              transaction.category,
          }
        : {}),
      ...(transaction.billSplit?.location
        ? { location: transaction.billSplit.location }
        : {}),
      ...(transaction.billSplit?.note
        ? { note: transaction.billSplit.note }
        : {}),
      ...(transaction.billSplit
        ? {
            totalParticipants: transaction.billSplit.participants.length,
            paidParticipants: transaction.billSplit.participants.filter(
              (p) => p.isPaid,
            ).length,
          }
        : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      transactionId: transaction.id,
    };

    res.json({ transaction: formatted });
  } catch (error) {
    console.error("Get transaction error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Send money
router.post(
  "/send",
  [
    body("receiverId").notEmpty(),
    body("amount").isFloat({ min: 0.01 }),
    body("description").optional().trim(),
    body("category").optional().isIn(Object.values(TRANSACTION_CATEGORY_MAP)),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { receiverId, amount, description, category } = req.body;
      const mappedCategory = category
        ? REVERSE_TRANSACTION_CATEGORY_MAP[category] || category
        : undefined;

      // Check if receiver exists
      const receiver = await req.prisma.user.findUnique({
        where: { id: receiverId },
      });

      if (!receiver) {
        return res.status(404).json({ error: "Receiver not found" });
      }

      // Check if user has sufficient balance (in a real app, you'd integrate with payment provider)
      const sender = await req.prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (sender.balance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Create transaction and update balances
      const transaction = await req.prisma.$transaction(async (prisma) => {
        // Create transaction record
        const newTransaction = await prisma.transaction.create({
          data: {
            senderId: req.userId,
            receiverId,
            amount,
            description,
            type: "SEND",
            status: "COMPLETED",
            ...(mappedCategory ? { category: mappedCategory } : {}),
          },
          include: {
            sender: {
              select: { id: true, name: true, email: true, avatar: true },
            },
            receiver: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        });

        // Update sender balance
        await prisma.user.update({
          where: { id: req.userId },
          data: { balance: { decrement: amount } },
        });

        // Update receiver balance
        await prisma.user.update({
          where: { id: receiverId },
          data: { balance: { increment: amount } },
        });

        return newTransaction;
      });

      const formatted = {
        ...transaction,
        type: TRANSACTION_TYPE_MAP[transaction.type] || transaction.type,
        status:
          TRANSACTION_STATUS_MAP[transaction.status] || transaction.status,
        ...(transaction.category
          ? {
              category:
                TRANSACTION_CATEGORY_MAP[transaction.category] ||
                transaction.category,
            }
          : {}),
      };

      await createNotification(req.prisma, {
        recipientId: receiverId,
        actorId: req.userId,
        type: "payment_received",
        title: "Payment received",
        message: `${transaction.sender.name} sent you ${amount}`,
        amount,
      });

      res.status(201).json({
        message: "Money sent successfully",
        transaction: formatted,
      });
    } catch (error) {
      console.error("Send money error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Mark a request transaction as sent/completed by the payer
router.post("/:id/mark-sent", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the transaction
    const tx = await req.prisma.transaction.findUnique({ where: { id } });

    if (!tx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Only the payer (senderId on the request tx) can mark as sent
    if (tx.senderId !== req.userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this transaction" });
    }

    // Idempotency: if already marked as sent and awaiting confirmation, do not duplicate
    if (tx.type === "SEND" && tx.status === "PENDING") {
      const formatted = {
        ...tx,
        type: TRANSACTION_TYPE_MAP[tx.type] || tx.type,
        status: TRANSACTION_STATUS_MAP[tx.status] || tx.status,
        ...(tx.category
          ? {
              category:
                TRANSACTION_CATEGORY_MAP[tx.category] || tx.category,
            }
          : {}),
      };
      // Ensure an actionable notification exists; create only if missing
      const existingNotif = await req.prisma.notification.findFirst({
        where: {
          recipientId: tx.receiverId,
          type: "payment_confirm",
          message: { contains: `TX:${tx.id}` },
        },
      });
      if (!existingNotif) {
        await createNotification(req.prisma, {
          recipientId: tx.receiverId,
          actorId: tx.senderId,
          type: "payment_confirm",
          title: "Confirm payment",
          message: `${req.userId} marked ${tx.amount} as sent. Tap Accept to confirm. TX:${tx.id}`,
          amount: tx.amount,
          actionable: true,
        });
      }
      return res.json({ transaction: formatted });
    }

    // Only allow transitioning request -> sent when pending
    if (tx.type !== "REQUEST" || tx.status !== "PENDING") {
      return res
        .status(400)
        .json({
          error: "Only pending request transactions can be marked as sent",
        });
    }

    // Do NOT transfer funds here. Move to manual confirmation by receiver.
    // Transition request -> send pending (awaiting confirmation)
    const updated = await req.prisma.transaction.update({
      where: { id },
      data: {
        type: "SEND",
        status: "PENDING",
      },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    const formatted = {
      ...updated,
      type: TRANSACTION_TYPE_MAP[updated.type] || updated.type,
      status: TRANSACTION_STATUS_MAP[updated.status] || updated.status,
      ...(updated.category
        ? {
            category:
              TRANSACTION_CATEGORY_MAP[updated.category] || updated.category,
          }
        : {}),
    };

    // Avoid duplicate confirmation notifications for the same TX
    const existingNotif = await req.prisma.notification.findFirst({
      where: {
        recipientId: updated.receiverId,
        type: "payment_confirm",
        message: { contains: `TX:${updated.id}` },
      },
    });
    if (!existingNotif) {
      await createNotification(req.prisma, {
        recipientId: updated.receiverId,
        actorId: updated.senderId,
        type: "payment_confirm",
        title: "Confirm payment",
        message: `${updated.sender.name} marked ${updated.amount} as sent. Tap Accept to confirm. TX:${updated.id}`,
        amount: updated.amount,
        actionable: true,
      });
    }

    res.json({ transaction: formatted });
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? error.status
        : 500;
    if (status === 400) {
      const message =
        error &&
        typeof error === "object" &&
        "message" in error &&
        error.message
          ? error.message
          : "Bad request";
      return res.status(400).json({ error: message });
    }
    console.error("Mark request as sent error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Receiver confirms payment receipt (manual confirmation)
router.post("/:id/confirm-received", async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await req.prisma.transaction.findUnique({ where: { id } });
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    if (tx.receiverId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to confirm" });
    }

    if (!(tx.type === "SEND" && tx.status === "PENDING")) {
      return res.status(400).json({ error: "Not awaiting confirmation" });
    }

    const updated = await req.prisma.$transaction(async (prisma) => {
      // Transfer balances now
      await prisma.user.update({
        where: { id: tx.senderId },
        data: { balance: { decrement: tx.amount } },
      });
      await prisma.user.update({
        where: { id: tx.receiverId },
        data: { balance: { increment: tx.amount } },
      });

      const newTx = await prisma.transaction.update({
        where: { id },
        data: { status: "COMPLETED" },
        include: {
          sender: { select: { id: true, name: true, email: true, avatar: true } },
          receiver: { select: { id: true, name: true, email: true, avatar: true } },
        },
      });
      // If this transaction relates to a bill split, update the participant's progress
      if (newTx.billSplitId) {
        try {
          await prisma.billSplitParticipant.update({
            where: {
              billSplitId_userId: {
                billSplitId: newTx.billSplitId,
                userId: newTx.senderId,
              },
            },
            data: { isPaid: true, status: "CONFIRMED" },
          });
        } catch (e) {
          console.warn("Bill split participant update failed during confirm:", e);
        }
      }
      return newTx;
    });

    const formatted = {
      ...updated,
      type: TRANSACTION_TYPE_MAP[updated.type] || updated.type,
      status: TRANSACTION_STATUS_MAP[updated.status] || updated.status,
      ...(updated.category
        ? {
            category:
              TRANSACTION_CATEGORY_MAP[updated.category] || updated.category,
          }
        : {}),
    };

    // Notify payer that receiver confirmed
    await createNotification(req.prisma, {
      recipientId: updated.senderId,
      actorId: updated.receiverId,
      type: "payment_confirmed",
      title: "Payment confirmed",
      message: `${updated.receiver.name} confirmed your payment of ${updated.amount}`,
      amount: updated.amount,
    });

    res.json({ transaction: formatted });
  } catch (error) {
    console.error("Confirm received error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Receiver declines the payment (keeps as request pending)
router.post("/:id/decline-received", async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await req.prisma.transaction.findUnique({ where: { id } });
    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    if (tx.receiverId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to decline" });
    }
    if (!(tx.type === "SEND" && tx.status === "PENDING")) {
      return res.status(400).json({ error: "Not awaiting confirmation" });
    }

    const updated = await req.prisma.transaction.update({
      where: { id },
      data: { type: "REQUEST", status: "PENDING" },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    // If tied to a bill split, revert participant status back to PENDING (not paid)
    if (updated.billSplitId) {
      try {
        await req.prisma.billSplitParticipant.update({
          where: {
            billSplitId_userId: {
              billSplitId: updated.billSplitId,
              userId: updated.senderId,
            },
          },
          data: { status: "PENDING" },
        });
      } catch (e) {
        console.warn("Bill split participant update failed during decline:", e);
      }
    }

    await createNotification(req.prisma, {
      recipientId: updated.senderId,
      actorId: updated.receiverId,
      type: "payment_declined",
      title: "Confirmation declined",
      message: `${updated.receiver.name} declined the confirmation for ${updated.amount}`,
      amount: updated.amount,
    });

    const formatted = {
      ...updated,
      type: TRANSACTION_TYPE_MAP[updated.type] || updated.type,
      status: TRANSACTION_STATUS_MAP[updated.status] || updated.status,
    };
    res.json({ transaction: formatted });
  } catch (error) {
    console.error("Decline received error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
