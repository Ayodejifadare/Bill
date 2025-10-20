import express from "express";
import { body, validationResult } from "express-validator";
import authenticate from "../middleware/auth.js";
import { normalizeMobileAccountNumber } from "../utils/phone.js";

const router = express.Router();

router.use(authenticate);

// Get all payment methods for current user
router.get("/", async (req, res) => {
  try {
    const methods = await req.prisma.paymentMethod.findMany({
      where: { userId: req.userId },
    });
    res.json(methods);
  } catch (error) {
    console.error("Get payment methods error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new payment method
router.post("/", [body("type").trim().notEmpty()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      type,
      bank,
      accountNumber,
      accountName,
      sortCode,
      routingNumber,
      accountType,
      provider,
      phoneNumber,
      isDefault,
    } = req.body;

    if (isDefault) {
      await req.prisma.paymentMethod.updateMany({
        where: { userId: req.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Normalize mobile money phone number (store national number e.g., 7062447566)
    let normalizedPhone = phoneNumber;
    if (type === "mobile_money" && phoneNumber) {
      const user = await req.prisma.user.findUnique({
        where: { id: req.userId },
        select: { region: true },
      });
      normalizedPhone = normalizeMobileAccountNumber(
        phoneNumber,
        user?.region || "NG",
      );
    }

    const method = await req.prisma.paymentMethod.create({
      data: {
        type,
        bank,
        accountNumber,
        accountName,
        sortCode,
        routingNumber,
        accountType,
        provider,
        phoneNumber: normalizedPhone,
        isDefault: !!isDefault,
        userId: req.userId,
      },
    });

    res.status(201).json(method);
  } catch (error) {
    console.error("Create payment method error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update payment method
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await req.prisma.paymentMethod.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    if (req.body.isDefault) {
      await req.prisma.paymentMethod.updateMany({
        where: { userId: req.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const data = {
      type: req.body.type,
      bank: req.body.bank,
      accountNumber: req.body.accountNumber,
      accountName: req.body.accountName,
      sortCode: req.body.sortCode,
      routingNumber: req.body.routingNumber,
      accountType: req.body.accountType,
      provider: req.body.provider,
      phoneNumber: req.body.phoneNumber,
      isDefault: req.body.isDefault,
    };

    // Normalize mobile money phone number if provided on update
    if (
      (data.type === "mobile_money" || existing.type === "mobile_money") &&
      typeof data.phoneNumber === "string"
    ) {
      const user = await req.prisma.user.findUnique({
        where: { id: req.userId },
        select: { region: true },
      });
      data.phoneNumber = normalizeMobileAccountNumber(
        data.phoneNumber,
        user?.region || "NG",
      );
    }

    Object.keys(data).forEach(
      (key) => data[key] === undefined && delete data[key],
    );

    const method = await req.prisma.paymentMethod.update({
      where: { id },
      data,
    });

    res.json(method);
  } catch (error) {
    console.error("Update payment method error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete payment method
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await req.prisma.paymentMethod.findFirst({
      where: { id, userId: req.userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    await req.prisma.paymentMethod.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete payment method error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
