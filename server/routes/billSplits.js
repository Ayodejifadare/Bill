import express from "express";
import { body, validationResult, param } from "express-validator";
import authenticate from "../middleware/auth.js";
import { computeNextRun } from "../utils/recurringBillSplitScheduler.js";
import { createNotification } from "../utils/notifications.js";

const router = express.Router();

const dayOfWeekMap = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// Authentication middleware
const authenticateToken = authenticate;

// Get user's bill splits
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      groupId,
      category,
      minAmount,
      maxAmount,
      keyword,
      page = 1,
      size = 20,
    } = req.query;

    const amountFilter = {};
    if (minAmount) amountFilter.gte = parseFloat(minAmount);
    if (maxAmount) amountFilter.lte = parseFloat(maxAmount);

    const where = {
      OR: [
        { createdBy: req.userId },
        { participants: { some: { userId: req.userId } } },
      ],
      ...(groupId && { groupId }),
      ...(category && { category }),
      ...(minAmount || maxAmount ? { totalAmount: amountFilter } : {}),
    };

    if (keyword) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: keyword, mode: "insensitive" } },
            { description: { contains: keyword, mode: "insensitive" } },
            {
              participants: {
                some: {
                  user: { name: { contains: keyword, mode: "insensitive" } },
                },
              },
            },
          ],
        },
      ];
    }

    const pageNum = Math.max(parseInt(page), 1);
    const pageSize = Math.max(parseInt(size), 1);

    const [total, splits] = await req.prisma.$transaction([
      req.prisma.billSplit.count({ where }),
      req.prisma.billSplit.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true } },
          participants: {
            include: { user: { select: { id: true, name: true } } },
          },
          group: { select: { id: true, name: true } },
          recurring: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const billSplits = splits.map((split) => {
      const your = split.participants.find((p) => p.userId === req.userId);
      const completed = split.participants.every((p) => p.isPaid);

      return {
        id: split.id,
        title: split.title,
        totalAmount: split.totalAmount,
        yourShare: your ? your.amount : 0,
        status: completed ? "completed" : "pending",
        participants: split.participants.map((p) => ({
          name: p.userId === req.userId ? "You" : p.user.name,
          amount: p.amount,
          paid: p.isPaid,
        })),
        createdBy: split.creator.id === req.userId ? "You" : split.creator.name,
        date: split.createdAt.toISOString(),
        groupId: split.groupId,
        groupName: split.group ? split.group.name : undefined,
        ...(split.category && { category: split.category }),
        ...(split.recurring && {
          schedule: {
            frequency: split.recurring.frequency,
            day: split.recurring.day,
            nextRun: split.recurring.nextRun,
          },
        }),
      };
    });

    res.json({
      billSplits,
      total,
      pageCount: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Get bill splits error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get bill split by ID
router.get(
  "/:id",
  [authenticateToken, param("id").trim().notEmpty().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;

      const billSplit = await req.prisma.billSplit.findUnique({
        where: { id },
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
          items: true,
          group: { select: { id: true, name: true } },
          recurring: true,
        },
      });

      if (
        !billSplit ||
        (billSplit.createdBy !== req.userId &&
          !billSplit.participants.some((p) => p.userId === req.userId))
      ) {
        return res.status(404).json({ error: "Bill split not found" });
      }

      let paymentMethod = null;
      if (billSplit.paymentMethodId) {
        const pm = await req.prisma.paymentMethod.findUnique({
          where: { id: billSplit.paymentMethodId },
        });
        if (pm) {
          paymentMethod = {
            id: pm.id,
            type: pm.type,
            bankName: pm.bank,
            accountNumber: pm.accountNumber,
            accountHolderName: pm.accountName,
            sortCode: pm.sortCode,
            routingNumber: pm.routingNumber,
            accountType: pm.accountType,
            provider: pm.provider,
            phoneNumber: pm.phoneNumber,
            isDefault: pm.isDefault,
          };
        }
      }

      const paidCount = billSplit.participants.filter((p) => p.isPaid).length;
      const yourParticipant = billSplit.participants.find(
        (p) => p.userId === req.userId,
      );

      const formatted = {
        id: billSplit.id,
        title: billSplit.title,
        totalAmount: billSplit.totalAmount,
        yourShare: yourParticipant ? yourParticipant.amount : 0,
        status:
          paidCount === billSplit.participants.length ? "completed" : "pending",
        date: billSplit.createdAt.toISOString(),
        ...(billSplit.location ? { location: billSplit.location } : {}),
        ...(billSplit.note ? { note: billSplit.note } : {}),
        ...(billSplit.splitMethod
          ? { splitMethod: billSplit.splitMethod }
          : {}),
        createdBy:
          billSplit.creator.id === req.userId ? "You" : billSplit.creator.name,
        creatorId: billSplit.creator.id,
        groupId: billSplit.groupId,
        groupName: billSplit.group ? billSplit.group.name : undefined,
        paymentMethod,
        participants: billSplit.participants.map((p) => ({
          userId: p.userId,
          name: p.userId === req.userId ? "You" : p.user.name,
          amount: p.amount,
          paid: p.isPaid,
        })),
        items: billSplit.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        ...(billSplit.recurring && {
          schedule: {
            frequency: billSplit.recurring.frequency,
            day: billSplit.recurring.day,
            nextRun: billSplit.recurring.nextRun,
          },
        }),
      };

      res.json({ billSplit: formatted });
    } catch (error) {
      console.error("Get bill split error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Generate a server-side payment reference for a bill split
router.post(
  "/:id/reference",
  [authenticateToken, param("id").trim().notEmpty().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      // Ensure the requester is the creator or a participant
      const billSplit = await req.prisma.billSplit.findUnique({
        where: { id },
        include: { participants: { select: { userId: true } } },
      });

      if (
        !billSplit ||
        (billSplit.createdBy !== req.userId &&
          !billSplit.participants.some((p) => p.userId === req.userId))
      ) {
        return res.status(404).json({ error: "Bill split not found" });
      }

      // Generate a unique, human-readable reference and persist it
      const shortBill = String(id).slice(-6);
      const shortUser = String(req.userId).slice(-6);
      const ts = new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, "")
        .slice(0, 14); // YYYYMMDDHHMMSS
      const code = `BTP-${shortBill}-${shortUser}-${ts}`;

      const created = await req.prisma.paymentReference.create({
        data: {
          code,
          userId: req.userId,
          billSplitId: id,
        },
      });

      return res.json({
        reference: created.code,
        id: created.id,
        createdAt: created.createdAt,
      });
    } catch (error) {
      console.error("Create bill split reference error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Send reminders to participants
router.post(
  "/:id/reminders",
  [
    authenticateToken,
    param("id").trim().notEmpty(),
    body("participantIds").isArray({ min: 1 }),
    body("type").optional().isString(),
    body("template").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const {
        participantIds,
        type = "bill_split_reminder",
        template = "",
      } = req.body;

      const billSplit = await req.prisma.billSplit.findUnique({
        where: { id },
        include: { participants: true },
      });

      if (!billSplit) {
        return res.status(404).json({ error: "Bill split not found" });
      }

      if (
        billSplit.createdBy !== req.userId &&
        !billSplit.participants.some((p) => p.userId === req.userId)
      ) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const targets = billSplit.participants.filter((p) =>
        participantIds.includes(p.userId),
      );

      if (targets.length === 0) {
        return res
          .status(400)
          .json({ error: "No valid participants provided" });
      }

      const reminders = [];
      for (const participant of targets) {
        const channels = [];
        // Check notification preferences
        const pref = await req.prisma.notificationPreference.findUnique({
          where: { userId: participant.userId },
        });
        let settings;
        if (pref) {
          settings =
            typeof pref.preferences === "string"
              ? JSON.parse(pref.preferences)
              : pref.preferences;
        }

        if (!settings || settings.push?.enabled !== false) {
          await createNotification(req.prisma, {
            recipientId: participant.userId,
            actorId: req.userId,
            type: "bill_split_reminder",
            title: "Payment Reminder",
            message:
              template || `Please settle your share for ${billSplit.title}.`,
          });
          channels.push("push");
        }

        if (settings?.email?.enabled) {
          channels.push("email");
          console.log(
            `Sending email reminder to user ${participant.userId} for bill split ${id}`,
          );
        }

        const reminder = await req.prisma.billSplitReminder.create({
          data: {
            billSplitId: id,
            senderId: req.userId,
            recipientId: participant.userId,
            type,
            template,
            channels: JSON.stringify(channels),
          },
        });
        reminders.push({
          id: reminder.id,
          recipientId: participant.userId,
          channels,
        });
      }

      res.status(201).json({ reminders });
    } catch (error) {
      console.error("Send reminders error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Create bill split
router.post(
  "/",
  [
    authenticateToken,
    body("title").trim().notEmpty(),
    body("totalAmount").isFloat({ min: 0.01 }),
    body("participants").isArray({ min: 1 }),
    body("participants.*.id").trim().notEmpty(),
    body("participants.*.amount").isFloat({ gt: 0 }),
    body("splitMethod").optional().isString(),
    body("groupId").optional().trim(),
    body("paymentMethodId").optional().trim(),
    body("isRecurring").optional().isBoolean(),
    body("frequency").optional().isString(),
    body("day").optional().isInt(),
    body("dayOfWeek")
      .optional()
      .isIn([
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ]),
    body("description").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        totalAmount,
        participants,
        description,
        splitMethod,
        groupId,
        paymentMethodId,
        isRecurring = false,
        frequency,
        day,
        dayOfWeek,
      } = req.body;

      // Validate participant totals ~= totalAmount with small tolerance (<= 1 cent)
      const toCents = (n) => Math.round(Number(n) * 100);
      const totalCents = toCents(totalAmount);
      const participantsCents = Array.isArray(participants)
        ? participants.reduce((sum, p) => sum + toCents(p.amount), 0)
        : 0;
      const EPSILON_CENTS = 1; // allow up to 1 cent rounding difference
      const delta = Math.abs(participantsCents - totalCents);
      if (delta > EPSILON_CENTS) {
        return res.status(400).json({
          error: "Participants total does not match totalAmount",
          details: {
            totalAmount,
            participantsTotal: participants.reduce(
              (s, p) => s + Number(p.amount),
              0,
            ),
            delta: Math.abs(
              participants.reduce((s, p) => s + Number(p.amount), 0) -
                Number(totalAmount),
            ),
          },
        });
      }

      const dayValue =
        frequency === "weekly"
          ? (dayOfWeekMap[dayOfWeek?.toLowerCase?.()] ?? 0)
          : typeof day === "string"
            ? parseInt(day, 10)
            : day;

      const billSplit = await req.prisma.$transaction(async (prisma) => {
        const newBillSplit = await prisma.billSplit.create({
          data: {
            title,
            description,
            totalAmount,
            createdBy: req.userId,
            ...(splitMethod && { splitMethod }),
            ...(groupId && { groupId }),
            ...(paymentMethodId && { paymentMethodId }),
            isRecurring,
          },
        });

        await prisma.billSplitParticipant.createMany({
          data: participants.map((p) => ({
            billSplitId: newBillSplit.id,
            userId: p.id,
            amount: p.amount,
          })),
        });

        // If this split belongs to a group, mirror entries in transactions for activity feed
        if (groupId) {
          // Create a transaction from creator to each participant to reflect owed shares
          for (const p of participants) {
            await prisma.transaction.create({
              data: {
                senderId: req.userId,
                receiverId: p.id,
                amount: Number(p.amount),
                type: "BILL_SPLIT",
                status: p.id === req.userId ? "COMPLETED" : "PENDING",
                description: description || title,
                billSplitId: newBillSplit.id,
              },
            });
          }
        }

        if (isRecurring && frequency) {
          const nextRun = computeNextRun(frequency, dayValue);
          await prisma.recurringBillSplit.create({
            data: {
              billSplitId: newBillSplit.id,
              frequency,
              day: dayValue,
              nextRun,
            },
          });
        }

        return await prisma.billSplit.findUnique({
          where: { id: newBillSplit.id },
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
            recurring: true,
          },
        });
      });

      const { recurring, ...rest } = billSplit;
      res.status(201).json({
        message: "Bill split created successfully",
        billSplit: {
          ...rest,
          ...(recurring && { schedule: recurring }),
        },
      });
    } catch (error) {
      console.error("Create bill split error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Update bill split
router.put(
  "/:id",
  [
    authenticateToken,
    param("id").trim().notEmpty(),
    body("title").trim().notEmpty(),
    body("items").isArray({ min: 1 }),
    body("items.*.name").trim().notEmpty(),
    body("items.*.price").isFloat({ gt: 0 }),
    body("items.*.quantity").isInt({ min: 1 }),
    body("participants").isArray({ min: 1 }),
    body("participants.*.id").trim().notEmpty(),
    body("participants.*.amount").isFloat({ gt: 0 }),
    body("splitMethod").isIn(["equal", "percentage", "custom"]),
    body("paymentMethodId").trim().notEmpty(),
    body("location").optional().trim(),
    body("date").optional().isISO8601(),
    body("note").optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const {
        title,
        items,
        participants,
        splitMethod,
        paymentMethodId,
        location,
        date,
        note,
      } = req.body;

      // Ensure bill split exists and user is creator
      const existing = await req.prisma.billSplit.findUnique({
        where: { id },
        select: { createdBy: true },
      });

      if (!existing) {
        return res.status(404).json({ error: "Bill split not found" });
      }

      if (existing.createdBy !== req.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const totalAmount = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const billSplit = await req.prisma.$transaction(async (prisma) => {
        // Update bill split record
        await prisma.billSplit.update({
          where: { id },
          data: {
            title,
            location,
            date: date ? new Date(date) : undefined,
            note,
            splitMethod,
            paymentMethodId,
            totalAmount,
          },
        });

        // Replace line items
        await prisma.billItem.deleteMany({ where: { billSplitId: id } });
        await prisma.billItem.createMany({
          data: items.map((item) => ({
            billSplitId: id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        });

        // Replace participants allocations
        await prisma.billSplitParticipant.deleteMany({
          where: { billSplitId: id },
        });
        await prisma.billSplitParticipant.createMany({
          data: participants.map((p) => ({
            billSplitId: id,
            userId: p.id,
            amount: p.amount,
          })),
        });

        // Return updated bill split with relations
        return prisma.billSplit.findUnique({
          where: { id },
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
            items: true,
          },
        });
      });

      res.json({ billSplit });
    } catch (error) {
      console.error("Update bill split error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Mark payment status for current user
router.post(
  "/:id/payments",
  [
    authenticateToken,
    param("id").trim().notEmpty(),
    body("status").optional().isIn(["SENT", "CONFIRMED"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { status = "SENT" } = req.body;

      const participant = await req.prisma.billSplitParticipant.findUnique({
        where: { billSplitId_userId: { billSplitId: id, userId: req.userId } },
      });

      if (!participant) {
        return res.status(404).json({ error: "Participant not found" });
      }

      const updateData = { status };
      if (status === "CONFIRMED") {
        updateData.isPaid = true;
      }

      await req.prisma.billSplitParticipant.update({
        where: { billSplitId_userId: { billSplitId: id, userId: req.userId } },
        data: updateData,
      });

      if (status === "SENT") {
        // Ensure a pending SEND transaction exists for this bill split between participant (sender) and creator (receiver)
        const billSplit = await req.prisma.billSplit.findUnique({
          where: { id },
          select: { createdBy: true, title: true, paymentMethodId: true },
        });
        if (billSplit && billSplit.createdBy !== req.userId) {
          const amount = participant.amount;
          // Auto-confirm when the bill's payment method belongs to the creator
          let autoConfirmed = false;
          if (billSplit.paymentMethodId) {
            try {
              const pm = await req.prisma.paymentMethod.findUnique({
                where: { id: billSplit.paymentMethodId },
                select: { userId: true },
              });
              if (pm && pm.userId === billSplit.createdBy) {
                await req.prisma.$transaction(async (prisma) => {
                  // Mark participant as paid/confirmed
                  await prisma.billSplitParticipant.update({
                    where: {
                      billSplitId_userId: { billSplitId: id, userId: req.userId },
                    },
                    data: { isPaid: true, status: "CONFIRMED" },
                  });
                  // Move balances and create completed settlement transaction
                  await prisma.user.update({
                    where: { id: req.userId },
                    data: { balance: { decrement: amount } },
                  });
                  await prisma.user.update({
                    where: { id: billSplit.createdBy },
                    data: { balance: { increment: amount } },
                  });
                  // Avoid duplicate transactions
                  const existing = await prisma.transaction.findFirst({
                    where: {
                      billSplitId: id,
                      senderId: req.userId,
                      receiverId: billSplit.createdBy,
                      type: "BILL_SPLIT",
                      status: "COMPLETED",
                    },
                  });
                  if (!existing) {
                    await prisma.transaction.create({
                      data: {
                        billSplitId: id,
                        senderId: req.userId,
                        receiverId: billSplit.createdBy,
                        amount,
                        description: `Settlement for ${billSplit.title}`,
                        type: "BILL_SPLIT",
                        status: "COMPLETED",
                      },
                    });
                  }
                });
                autoConfirmed = true;
              }
            } catch {
              /* ignore auto-confirm failure */
            }
          }
          if (!autoConfirmed) {
          // Find existing pending SEND for this participant and bill split
          let tx = await req.prisma.transaction.findFirst({
            where: {
              billSplitId: id,
              senderId: req.userId,
              receiverId: billSplit.createdBy,
              type: "SEND",
              status: "PENDING",
            },
          });
          if (!tx) {
            tx = await req.prisma.transaction.create({
              data: {
                billSplitId: id,
                senderId: req.userId,
                receiverId: billSplit.createdBy,
                amount,
                description: `Settlement for ${billSplit.title}`,
                type: "SEND",
                status: "PENDING",
              },
            });
          }
          // Send a standard payment_confirm notification for unified manual confirmation UX (include TX:id marker)
          const existingNotif = await req.prisma.notification.findFirst({
            where: {
              recipientId: billSplit.createdBy,
              type: "payment_confirm",
              message: { contains: `TX:${tx.id}` },
            },
          });
          if (!existingNotif) {
            await createNotification(req.prisma, {
              recipientId: billSplit.createdBy,
              actorId: req.userId,
              type: "payment_confirm",
              title: "Confirm payment",
              message: `${req.userId} marked ${amount} as sent for ${billSplit.title}. Tap Accept to confirm. TX:${tx.id}`,
              amount,
              actionable: true,
            });
          }
          }
        }
      }

      res.json({ message: "Payment status updated" });
    } catch (error) {
      console.error("Update payment status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Creator confirms a participant's payment and records transaction
router.post(
  "/:id/confirm-payment",
  [
    authenticateToken,
    param("id").trim().notEmpty(),
    body("participantUserId").trim().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { participantUserId } = req.body;

      // Load bill split with creator, participants and payment method
      const billSplit = await req.prisma.billSplit.findUnique({
        where: { id },
        include: {
          participants: true,
          creator: { select: { id: true } },
        },
      });

      if (!billSplit) {
        return res.status(404).json({ error: "Bill split not found" });
      }

      // Ensure requester is the creator
      if (billSplit.createdBy !== req.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Ensure participant exists on this bill
      const participant = billSplit.participants.find(
        (p) => p.userId === participantUserId,
      );
      if (!participant) {
        return res.status(404).json({ error: "Participant not found" });
      }

      // No-op if already confirmed
      if (participant.isPaid) {
        return res.json({ message: "Already confirmed" });
      }

      const updated = await req.prisma.$transaction(async (prisma) => {
        // Mark participant as paid/confirmed
        await prisma.billSplitParticipant.update({
          where: {
            billSplitId_userId: { billSplitId: id, userId: participantUserId },
          },
          data: { isPaid: true, status: "CONFIRMED" },
        });

        // Create settlement transaction if it doesn't exist
        const existingTx = await prisma.transaction.findFirst({
          where: {
            billSplitId: id,
            senderId: participantUserId,
            receiverId: billSplit.createdBy,
            type: "BILL_SPLIT",
          },
        });

        if (!existingTx) {
          const newTx = await prisma.transaction.create({
            data: {
              senderId: participantUserId,
              receiverId: billSplit.createdBy,
              amount: participant.amount,
              description: `Settlement for ${billSplit.title}`,
              type: "BILL_SPLIT",
              status: "COMPLETED",
              billSplitId: id,
            },
          });

          // Transfer balances
          await prisma.user.update({
            where: { id: newTx.senderId },
            data: { balance: { decrement: newTx.amount } },
          });
          await prisma.user.update({
            where: { id: newTx.receiverId },
            data: { balance: { increment: newTx.amount } },
          });
        }

        // Return lightweight progress summary
        const refreshed = await prisma.billSplit.findUnique({
          where: { id },
          include: { participants: true },
        });

        const paidCount = refreshed.participants.filter((p) => p.isPaid).length;
        const totalCount = refreshed.participants.length;
        const totalPaid = refreshed.participants
          .filter((p) => p.isPaid)
          .reduce((sum, p) => sum + Number(p.amount || 0), 0);

        return { paidCount, totalCount, totalPaid };
      });

      // Notify participant that the payment was confirmed
      try {
        await createNotification(req.prisma, {
          recipientId: participantUserId,
          actorId: req.userId,
          type: "bill_split_payment_confirmed",
          title: "Payment confirmed",
          message: `Your payment was confirmed for ${billSplit.title}`,
          amount: participant.amount,
          actionable: false,
        });
      } catch (e) {
        // Non-fatal
        console.warn("Notification error (confirm-payment):", e);
      }

      return res.json({ message: "Payment confirmed", progress: updated });
    } catch (error) {
      console.error("Confirm participant payment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Settle bill split
router.post(
  "/:id/settle",
  [
    authenticateToken,
    param("id").trim().notEmpty(),
    body("receiptId").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { receiptId } = req.body;

      const billSplit = await req.prisma.billSplit.findUnique({
        where: { id },
        include: { participants: true },
      });

      if (!billSplit) {
        return res.status(404).json({ error: "Bill split not found" });
      }

      if (billSplit.createdBy !== req.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const allPaid = billSplit.participants.every((p) => p.isPaid);
      if (!allPaid) {
        return res
          .status(400)
          .json({
            error: "All participants must confirm payment before settling",
          });
      }

      const updated = await req.prisma.$transaction(async (prisma) => {
        // Record settlement transactions for participants if needed
        for (const participant of billSplit.participants) {
          if (participant.userId === billSplit.createdBy) continue;

          const existing = await prisma.transaction.findFirst({
            where: {
              billSplitId: id,
              senderId: participant.userId,
              receiverId: billSplit.createdBy,
            },
          });

          if (!existing) {
            // Ensure participant has sufficient balance
            const payer = await prisma.user.findUnique({
              where: { id: participant.userId },
            });
            if (!payer || payer.balance < participant.amount) {
              throw Object.assign(
                new Error(`Participant has insufficient balance`),
                { status: 400 },
              );
            }

            // Create transaction
            const newTx = await prisma.transaction.create({
              data: {
                senderId: participant.userId,
                receiverId: billSplit.createdBy,
                amount: participant.amount,
                description: `Settlement for ${billSplit.title}`,
                type: "BILL_SPLIT",
                status: "COMPLETED",
                billSplitId: id,
              },
            });

            // Transfer balances
            await prisma.user.update({
              where: { id: newTx.senderId },
              data: { balance: { decrement: newTx.amount } },
            });
            await prisma.user.update({
              where: { id: newTx.receiverId },
              data: { balance: { increment: newTx.amount } },
            });
          }
        }

        if (receiptId) {
          await prisma.receipt.update({
            where: { id: receiptId },
            data: { billSplitId: id },
          });
        }

        // Update bill split status
        return prisma.billSplit.update({
          where: { id },
          data: { status: "SETTLED" },
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
            items: true,
          },
        });
      });

      res.json({ billSplit: updated });
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
      console.error("Settle bill split error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Delete bill split
router.delete(
  "/:id",
  [authenticateToken, param("id").trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;

      const existing = await req.prisma.billSplit.findUnique({
        where: { id },
        select: { createdBy: true },
      });

      if (!existing) {
        return res.status(404).json({ error: "Bill split not found" });
      }

      if (existing.createdBy !== req.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await req.prisma.$transaction(async (prisma) => {
        await prisma.billItem.deleteMany({ where: { billSplitId: id } });
        await prisma.billSplitParticipant.deleteMany({
          where: { billSplitId: id },
        });
        await prisma.billSplit.delete({ where: { id } });
      });

      res.json({ message: "Bill split deleted successfully" });
    } catch (error) {
      console.error("Delete bill split error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
