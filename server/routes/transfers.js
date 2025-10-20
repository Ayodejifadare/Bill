import express from "express";
import authenticate from "../middleware/auth.js";
import { generateBankSafeReference } from "../utils/paymentReference.js";

const router = express.Router();

// POST /initiate-transfer
// Records a transfer initiation for a bill split. This does not move funds; it
// validates input and creates an auditable reference for tracking.
router.post("/initiate-transfer", authenticate, async (req, res) => {
  try {
    const {
      billSplitId,
      recipientName,
      bankName,
      accountNumber,
      amount,
      narration,
    } = req.body || {};

    if (
      !billSplitId ||
      !recipientName ||
      !bankName ||
      !accountNumber ||
      !amount
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Ensure bill split exists and the user is a participant or creator
    const billSplit = await req.prisma.billSplit.findUnique({
      where: { id: String(billSplitId) },
      include: { participants: true },
    });
    if (!billSplit) {
      return res.status(404).json({ error: "Bill split not found" });
    }
    const isParticipant =
      billSplit.createdBy === req.user.id ||
      billSplit.participants.some((p) => p.userId === req.user.id);
    if (!isParticipant) {
      return res
        .status(403)
        .json({ error: "Not authorized for this bill split" });
    }

    // Resolve region for better reference semantics
    let userRegion = "US";
    try {
      const u = await req.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { region: true },
      });
      if (u?.region) userRegion = String(u.region).toUpperCase();
    } catch {}

    // Create a bank-safe numeric reference with checksum (avoids words/prefixes)
    const code = generateBankSafeReference({ totalLength: 16 });
    await req.prisma.paymentReference.create({
      data: {
        code,
        userId: req.user.id,
        billSplitId: billSplit.id,
        used: true, // mark as used for single-shot initiation
      },
    });

    // Optionally, we could update bill split status or add a security log entry
    // but we avoid mutating status automatically to prevent unintended state.

    return res.json({ success: true, reference: code });
  } catch (err) {
    console.error("Initiate transfer error:", err);
    return res.status(500).json({ error: "Failed to initiate transfer" });
  }
});

export default router;
