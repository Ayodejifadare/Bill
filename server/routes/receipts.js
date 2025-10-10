import express from "express";
import multer from "multer";
import { body, validationResult, param } from "express-validator";
import path from "path";
import fs from "fs";
import authenticate from "../middleware/auth.js";

const router = express.Router();

const uploadDir = process.env.RECEIPT_UPLOAD_DIR || "uploads/receipts";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), uploadDir);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

router.use(authenticate);

// Create receipt
router.post(
  "/",
  upload.single("file"),
  [
    body("metadata").optional().isString(),
    body("transactionId").optional().isString(),
    body("billSplitId").optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { metadata, transactionId, billSplitId } = req.body;
      const url = `${req.protocol}://${req.get("host")}/${uploadDir}/${req.file.filename}`;

      const receipt = await req.prisma.receipt.create({
        data: {
          url,
          metadata,
          transactionId,
          billSplitId,
        },
      });

      res.status(201).json({ receipt });
    } catch (error) {
      console.error("Create receipt error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Get receipt by ID
router.get("/:id", [param("id").trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const receipt = await req.prisma.receipt.findUnique({
      where: { id: req.params.id },
    });

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    if (receipt.transactionId) {
      const tx = await req.prisma.transaction.findUnique({
        where: { id: receipt.transactionId },
        select: { senderId: true, receiverId: true },
      });
      if (!tx || (tx.senderId !== req.userId && tx.receiverId !== req.userId)) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    if (receipt.billSplitId) {
      const bs = await req.prisma.billSplit.findFirst({
        where: {
          id: receipt.billSplitId,
          OR: [
            { createdBy: req.userId },
            { participants: { some: { userId: req.userId } } },
          ],
        },
        select: { id: true },
      });
      if (!bs) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    res.json({ receipt });
  } catch (error) {
    console.error("Get receipt error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
