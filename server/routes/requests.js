import express from "express";
import { body, validationResult } from "express-validator";
import { computeNextDueDate } from "../utils/recurringRequestScheduler.js";
import { createNotification } from "../utils/notifications.js";
import authenticate from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

// Create payment request
router.post(
  "/",
  [
    body("amount").isFloat({ gt: 0 }),
    body("recipients").isArray({ min: 1 }),
    body("recipients.*").isString().notEmpty(),
    body("paymentMethod").isString().notEmpty(),
    body("description").optional().isString(),
    body("message").optional().isString(),
    body("isRecurring").optional().isBoolean(),
    body("recurringFrequency").optional().isString(),
    body("recurringDay").optional().isInt({ min: 1, max: 31 }),
    body("recurringDayOfWeek").optional().isInt({ min: 0, max: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        amount,
        recipients,
        paymentMethod,
        description,
        message,
        isRecurring = false,
        recurringFrequency,
        recurringDay,
        recurringDayOfWeek,
      } = req.body;

      const method = await req.prisma.paymentMethod.findFirst({
        where: { id: paymentMethod, userId: req.userId },
      });
      if (!method) {
        return res.status(403).json({ error: "Invalid payment method" });
      }

      const uniqueRecipients = [...new Set(recipients)];
      if (uniqueRecipients.some((id) => id === req.userId)) {
        return res
          .status(400)
          .json({ error: "Cannot request payment from yourself" });
      }

      const recipientsExist = await req.prisma.user.findMany({
        where: { id: { in: uniqueRecipients } },
        select: { id: true },
      });
      if (recipientsExist.length !== uniqueRecipients.length) {
        return res.status(400).json({ error: "Invalid recipients" });
      }

      const nextDueDate = isRecurring
        ? computeNextDueDate(
            recurringFrequency,
            recurringDay,
            recurringDayOfWeek,
          )
        : null;

      const requests = await Promise.all(
        uniqueRecipients.map((receiverId) =>
          req.prisma.paymentRequest.create({
            data: {
              senderId: req.userId,
              receiverId,
              amount,
              description,
              message,
              // Persist the payment method selected by the sender at creation time
              paymentMethodId: paymentMethod,
              status: "PENDING",
              isRecurring,
              recurringFrequency: isRecurring ? recurringFrequency : null,
              recurringDay: isRecurring ? recurringDay : null,
              recurringDayOfWeek: isRecurring ? recurringDayOfWeek : null,
              nextDueDate,
            },
            include: {
              sender: { select: { id: true, name: true } },
              receiver: { select: { id: true } },
            },
          }),
        ),
      );

      // Fire notifications to recipients
      await Promise.all(
        requests.map((r) =>
          createNotification(req.prisma, {
            recipientId: r.receiver.id,
            actorId: r.sender.id,
            type: "payment_request",
            title: "Payment request",
            message: `${r.sender.name} requested payment`,
            amount: r.amount,
            actionable: true,
          }),
        ),
      );

      // Respond with a slimmer payload
      res.status(201).json({
        requests: requests.map((r) => ({
          id: r.id,
          status: r.status,
          message: r.message,
        })),
      });
    } catch (error) {
      console.error("Create payment request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Get requests for the user
router.get("/", async (req, res) => {
  try {
    const requests = await req.prisma.paymentRequest.findMany({
      where: {
        OR: [{ senderId: req.userId }, { receiverId: req.userId }],
      },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ requests });
  } catch (error) {
    console.error("Get payment requests error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Accept payment request
router.post("/:id/accept", async (req, res) => {
  try {
    const { id } = req.params;
    const request = await req.prisma.paymentRequest.findUnique({
      where: { id },
    });

    if (!request || request.receiverId !== req.userId) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ error: "Request already processed" });
    }

    const updated = await req.prisma.paymentRequest.update({
      where: { id },
      data: { status: "ACCEPTED" },
    });

    const transaction = await req.prisma.transaction.create({
      data: {
        amount: updated.amount,
        description: updated.description,
        status: "PENDING",
        type: "REQUEST",
        senderId: updated.receiverId,
        receiverId: updated.senderId,
      },
    });

    // Notify the original sender that the request was accepted
    await createNotification(req.prisma, {
      recipientId: updated.senderId,
      actorId: req.userId,
      type: "payment_request_accepted",
      title: "Payment request accepted",
      message: "Your payment request was accepted",
      amount: updated.amount,
    });

    res.json({ request: updated, transaction });
  } catch (error) {
    console.error("Accept payment request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Decline payment request
router.post("/:id/decline", async (req, res) => {
  try {
    const { id } = req.params;
    const request = await req.prisma.paymentRequest.findUnique({
      where: { id },
    });

    if (!request || request.receiverId !== req.userId) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ error: "Request already processed" });
    }

    const updated = await req.prisma.paymentRequest.update({
      where: { id },
      data: { status: "DECLINED" },
    });

    // Notify the original sender that the request was declined
    await createNotification(req.prisma, {
      recipientId: updated.senderId,
      actorId: req.userId,
      type: "payment_request_declined",
      title: "Payment request declined",
      message: "Your payment request was declined",
      amount: updated.amount,
    });

    res.json({ request: updated });
  } catch (error) {
    console.error("Decline payment request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel payment request (sender only)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const request = await req.prisma.paymentRequest.findUnique({
      where: { id },
    });

    if (!request || request.senderId !== req.userId) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ error: "Request is not pending" });
    }

    const updated = await req.prisma.paymentRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    // Notify receiver that the request was cancelled
    await createNotification(req.prisma, {
      recipientId: updated.receiverId,
      actorId: req.userId,
      type: "payment_request_cancelled",
      title: "Payment request cancelled",
      message: "The payment request was cancelled",
      amount: updated.amount,
    });

    res.json({ request: updated });
  } catch (error) {
    console.error("Cancel payment request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

// Receiver marks a direct payment request as paid (one-step: accept + mark-sent)
router.post("/:id/mark-paid", async (req, res) => {
  try {
    const { id } = req.params;
    const pr = await req.prisma.paymentRequest.findUnique({ where: { id } });
    if (!pr) return res.status(404).json({ error: "Request not found" });

    // Only the receiver (payer) can mark as paid
    if (pr.receiverId !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (pr.status && pr.status !== "PENDING" && pr.status !== "ACCEPTED") {
      return res.status(400).json({ error: "Request already processed" });
    }

    const result = await req.prisma.$transaction(async (prisma) => {
      // Transition to ACCEPTED if still pending
      let updatedReq = pr;
      if (pr.status === "PENDING") {
        updatedReq = await prisma.paymentRequest.update({
          where: { id },
          data: { status: "ACCEPTED" },
        });
      }

      // Create a SEND/PENDING transaction to await confirmation from the original sender
      const tx = await prisma.transaction.create({
        data: {
          amount: updatedReq.amount,
          description: updatedReq.description,
          status: "PENDING",
          type: "SEND",
          senderId: updatedReq.receiverId, // the payer
          receiverId: updatedReq.senderId, // original requester
        },
      });

      return { updatedReq, tx };
    });

    // Notify original requester to confirm
    // Avoid duplicate confirm notifications for the same TX id
    const existingNotif = await req.prisma.notification.findFirst({
      where: {
        recipientId: result.updatedReq.senderId,
        type: "payment_confirm",
        message: { contains: `TX:${result.tx.id}` },
      },
    });
    if (!existingNotif) {
      await createNotification(req.prisma, {
        recipientId: result.updatedReq.senderId,
        actorId: req.userId,
        type: "payment_confirm",
        title: "Confirm payment",
        message: `A payer marked ${result.updatedReq.amount} as sent. Tap Accept to confirm. TX:${result.tx.id}`,
        amount: result.updatedReq.amount,
        actionable: true,
      });
    }

    res.json({ request: result.updatedReq, transaction: result.tx });
  } catch (error) {
    console.error("Mark request as paid error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
