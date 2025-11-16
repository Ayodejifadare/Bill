import express from "express";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import authenticate from "../middleware/auth.js";
import { createNotification } from "../utils/notifications.js";

const ACTIVE_STATUS = "ACTIVE";
const REVOKED_STATUS = "REVOKED";
const FULFILLED_STATUS = "FULFILLED";
const EXPIRED_STATUS = "EXPIRED";

const router = express.Router();
const publicRouter = express.Router();

router.use(authenticate);

const sanitizePrivate = (payLink) => ({
  id: payLink.id,
  slug: payLink.slug,
  token: payLink.token,
  title: payLink.title,
  message: payLink.message,
  amount: payLink.amount,
  currency: payLink.currency,
  status: payLink.status,
  expiresAt: payLink.expiresAt,
  recipientName: payLink.recipientName,
  recipientEmail: payLink.recipientEmail,
  recipientPhone: payLink.recipientPhone,
  paymentMethodId: payLink.paymentMethodId,
  paymentRequestId: payLink.paymentRequestId,
});

const sanitizePublic = (payLink) => {
  const base = {
    slug: payLink.slug,
    title: payLink.title,
    message: payLink.message,
    amount: payLink.amount,
    currency: payLink.currency,
    status: payLink.status,
    expiresAt: payLink.expiresAt,
    recipientName: payLink.recipientName,
    recipientEmail: payLink.recipientEmail,
    recipientPhone: payLink.recipientPhone,
    paymentRequestId: payLink.paymentRequestId,
  };
  if (payLink.user) {
    base.owner = {
      name: payLink.user.name,
      avatar: payLink.user.avatar,
    };
  }
  return base;
};

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const buildBaseSlug = (payload) => {
  if (payload.slug) return slugify(payload.slug);
  if (payload.title) return slugify(payload.title);
  if (payload.recipientName) return slugify(payload.recipientName);
  return "pay-link";
};

const ensureUniqueSlug = async (prisma, base) => {
  const fallback = base || "pay-link";
  let attempt = 0;
  while (true) {
    const candidate =
      attempt === 0 ? fallback : `${fallback}-${attempt.toString(36)}`;
    const existing = await prisma.payLink.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
    attempt += 1;
  }
};

const generateToken = async (prisma) => {
  let token;
  let existing;
  do {
    token = crypto.randomBytes(24).toString("hex");
    existing = await prisma.payLink.findUnique({
      where: { token },
      select: { id: true },
    });
  } while (existing);
  return token;
};

const ensurePaymentMethod = async (prisma, userId, paymentMethodId) =>
  prisma.paymentMethod.findFirst({
    where: { id: paymentMethodId, userId },
  });

const isExpired = (payLink) =>
  !!payLink.expiresAt && new Date(payLink.expiresAt) < new Date();

const refreshStatus = async (prisma, payLink, { includeUser = false } = {}) => {
  if (payLink && payLink.status === ACTIVE_STATUS && isExpired(payLink)) {
    await prisma.payLink.update({
      where: { id: payLink.id },
      data: { status: EXPIRED_STATUS },
    });
    return prisma.payLink.findUnique({
      where: { id: payLink.id },
      include: includeUser
        ? { user: { select: { name: true, avatar: true } } }
        : undefined,
    });
  }
  return payLink;
};

const creationValidations = [
  body("amount").isFloat({ gt: 0 }),
  body("paymentMethodId").isString().notEmpty(),
  body("currency").optional().isString(),
  body("title").optional().isString(),
  body("message").optional().isString(),
  body("expiresAt").optional().isISO8601(),
  body("recipientName").optional().isString(),
  body("recipientEmail").optional().isString(),
  body("recipientPhone").optional().isString(),
  body("slug").optional().isString(),
  body("paymentRequestId").optional().isString(),
  body("paymentRequest.receiverId").optional().isString(),
  body("paymentRequest.description").optional().isString(),
  body("paymentRequest.message").optional().isString(),
];

const updateValidations = [
  body("amount").optional().isFloat({ gt: 0 }),
  body("paymentMethodId").optional().isString(),
  body("currency").optional().isString(),
  body("title").optional().isString(),
  body("message").optional().isString(),
  body("expiresAt").optional().isISO8601(),
  body("recipientName").optional().isString(),
  body("recipientEmail").optional().isString(),
  body("recipientPhone").optional().isString(),
  body("slug").optional().isString(),
];

async function resolveLinkedPaymentRequest(prisma, {
  userId,
  paymentRequestId,
  paymentRequestPayload,
  amount,
  paymentMethodId,
  title,
  message,
}) {
  if (paymentRequestId) {
    const existing = await prisma.paymentRequest.findFirst({
      where: { id: paymentRequestId, senderId: userId },
      include: { payLink: true },
    });
    if (!existing) {
      throw new Error("PAYMENT_REQUEST_NOT_FOUND");
    }
    if (existing.payLink) {
      throw new Error("PAYMENT_REQUEST_ALREADY_LINKED");
    }
    if (existing.status && existing.status !== "PENDING") {
      throw new Error("PAYMENT_REQUEST_LOCKED");
    }
    return prisma.paymentRequest.update({
      where: { id: existing.id },
      data: {
        amount,
        paymentMethodId,
        description: title ?? existing.description,
        message: message ?? existing.message,
      },
    });
  }

  if (paymentRequestPayload?.receiverId) {
    if (paymentRequestPayload.receiverId === userId) {
      throw new Error("INVALID_PAYMENT_REQUEST_RECEIVER");
    }
    const receiver = await prisma.user.findUnique({
      where: { id: paymentRequestPayload.receiverId },
      select: { id: true },
    });
    if (!receiver) {
      throw new Error("INVALID_PAYMENT_REQUEST_RECEIVER");
    }

    return prisma.paymentRequest.create({
      data: {
        senderId: userId,
        receiverId: receiver.id,
        amount,
        description: paymentRequestPayload.description ?? title,
        message: paymentRequestPayload.message ?? message,
        paymentMethodId,
        status: "PENDING",
      },
    });
  }

  return null;
}

router.post("/", creationValidations, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      message,
      amount,
      currency,
      paymentMethodId,
      expiresAt,
      recipientName,
      recipientEmail,
      recipientPhone,
      paymentRequestId,
      paymentRequest: paymentRequestPayload,
    } = req.body;

    const method = await ensurePaymentMethod(
      req.prisma,
      req.userId,
      paymentMethodId,
    );
    if (!method) {
      return res.status(403).json({ error: "Invalid payment method" });
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.userId },
      select: { currency: true },
    });

    let paymentRequestRecord = null;
    try {
      paymentRequestRecord = await resolveLinkedPaymentRequest(req.prisma, {
        userId: req.userId,
        paymentRequestId,
        paymentRequestPayload,
        amount,
        paymentMethodId,
        title,
        message,
      });
    } catch (err) {
      if (err.message === "PAYMENT_REQUEST_NOT_FOUND") {
        return res.status(404).json({ error: "Payment request not found" });
      }
      if (err.message === "PAYMENT_REQUEST_ALREADY_LINKED") {
        return res
          .status(409)
          .json({ error: "Payment request already has a pay link" });
      }
      if (err.message === "PAYMENT_REQUEST_LOCKED") {
        return res
          .status(400)
          .json({ error: "Only pending payment requests can be linked" });
      }
      if (err.message === "INVALID_PAYMENT_REQUEST_RECEIVER") {
        return res.status(400).json({ error: "Invalid request receiver" });
      }
      throw err;
    }

    const slug = await ensureUniqueSlug(
      req.prisma,
      buildBaseSlug(req.body),
    );
    const token = await generateToken(req.prisma);

    const payLink = await req.prisma.payLink.create({
      data: {
        title,
        message,
        amount,
        currency: currency || user?.currency || "USD",
        paymentMethodId,
        userId: req.userId,
        slug,
        token,
        status: ACTIVE_STATUS,
        recipientName,
        recipientEmail,
        recipientPhone,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        paymentRequestId: paymentRequestRecord?.id,
      },
    });

    res.status(201).json({ payLink: sanitizePrivate(payLink) });
  } catch (error) {
    console.error("Create pay link error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    let payLink = await req.prisma.payLink.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!payLink) {
      return res.status(404).json({ error: "Pay link not found" });
    }
    payLink = await refreshStatus(req.prisma, payLink);
    res.json({ payLink: sanitizePrivate(payLink) });
  } catch (error) {
    console.error("Fetch pay link error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", updateValidations, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const payLink = await req.prisma.payLink.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!payLink) {
      return res.status(404).json({ error: "Pay link not found" });
    }

    if (
      req.body.paymentMethodId &&
      !(await ensurePaymentMethod(
        req.prisma,
        req.userId,
        req.body.paymentMethodId,
      ))
    ) {
      return res.status(403).json({ error: "Invalid payment method" });
    }

    const updateData = {
      title: req.body.title,
      message: req.body.message,
      amount: req.body.amount,
      currency: req.body.currency,
      paymentMethodId: req.body.paymentMethodId,
      recipientName: req.body.recipientName,
      recipientEmail: req.body.recipientEmail,
      recipientPhone: req.body.recipientPhone,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
    };

    if (req.body.slug) {
      updateData.slug = await ensureUniqueSlug(
        req.prisma,
        slugify(req.body.slug),
      );
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (updateData.amount && payLink.paymentRequestId) {
      await req.prisma.paymentRequest.update({
        where: { id: payLink.paymentRequestId },
        data: { amount: updateData.amount },
      });
    }

    if (updateData.paymentMethodId && payLink.paymentRequestId) {
      await req.prisma.paymentRequest.update({
        where: { id: payLink.paymentRequestId },
        data: { paymentMethodId: updateData.paymentMethodId },
      });
    }

    const updated = await req.prisma.payLink.update({
      where: { id: payLink.id },
      data: updateData,
    });

    res.json({ payLink: sanitizePrivate(updated) });
  } catch (error) {
    console.error("Update pay link error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/revoke", async (req, res) => {
  try {
    const payLink = await req.prisma.payLink.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!payLink) {
      return res.status(404).json({ error: "Pay link not found" });
    }
    if (payLink.status === REVOKED_STATUS) {
      return res.json({ payLink: sanitizePrivate(payLink) });
    }
    const updated = await req.prisma.payLink.update({
      where: { id: payLink.id },
      data: { status: REVOKED_STATUS },
    });
    res.json({ payLink: sanitizePrivate(updated) });
  } catch (error) {
    console.error("Revoke pay link error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/regenerate", async (req, res) => {
  try {
    const payLink = await req.prisma.payLink.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!payLink) {
      return res.status(404).json({ error: "Pay link not found" });
    }
    const token = await generateToken(req.prisma);
    const updated = await req.prisma.payLink.update({
      where: { id: payLink.id },
      data: { token, status: ACTIVE_STATUS },
    });
    res.json({ payLink: sanitizePrivate(updated) });
  } catch (error) {
    console.error("Regenerate pay link token error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

publicRouter.get("/:token", async (req, res) => {
  try {
    let payLink = await req.prisma.payLink.findUnique({
      where: { token: req.params.token },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    if (!payLink) {
      return res.status(404).json({ error: "Pay link not found" });
    }

    payLink = await refreshStatus(req.prisma, payLink, {
      includeUser: true,
    });
    if (
      payLink.status !== ACTIVE_STATUS &&
      payLink.status !== FULFILLED_STATUS
    ) {
      return res.status(410).json({ error: "Pay link is no longer active" });
    }

    if (payLink.status === ACTIVE_STATUS && isExpired(payLink)) {
      return res.status(410).json({ error: "Pay link expired" });
    }

    res.json({ payLink: sanitizePublic(payLink) });
  } catch (error) {
    console.error("Public pay link error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

publicRouter.post("/:token/mark-paid", async (req, res) => {
  try {
    let payLink = await req.prisma.payLink.findUnique({
      where: { token: req.params.token },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        paymentRequest: {
          include: {
            receiver: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!payLink) {
      return res.status(404).json({ error: "Pay link not found" });
    }

    if (isExpired(payLink) || payLink.status === REVOKED_STATUS) {
      await refreshStatus(req.prisma, payLink);
      return res.status(410).json({ error: "Pay link is not available" });
    }

    if (payLink.status === FULFILLED_STATUS) {
      return res.status(400).json({ error: "Pay link already fulfilled" });
    }

    const updated = await req.prisma.payLink.update({
      where: { id: payLink.id },
      data: { status: FULFILLED_STATUS },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        paymentRequest: {
          include: {
            receiver: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (updated.paymentRequestId) {
      await req.prisma.paymentRequest.updateMany({
        where: { id: updated.paymentRequestId },
        data: { status: "ACCEPTED" },
      });
    }

    if (updated.userId && updated.paymentRequest?.receiverId) {
      await createNotification(req.prisma, {
        recipientId: updated.userId,
        actorId: updated.paymentRequest.receiverId,
        type: "pay_link_paid",
        title: "Pay link paid",
        message:
          updated.paymentRequest?.receiver?.name
            ? `${updated.paymentRequest.receiver.name} marked ${updated.title || "a pay link"} as paid.`
            : `A recipient marked ${updated.title || "your pay link"} as paid.`,
        amount: updated.amount,
        actionable: false,
      });
    }

    res.json({ payLink: sanitizePublic(updated) });
  } catch (error) {
    console.error("Mark pay link paid error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { publicRouter as publicPayLinkRoutes };
export default router;
