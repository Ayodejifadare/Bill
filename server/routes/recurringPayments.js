import express from "express";
import authenticate from "../middleware/auth.js";
import { computeNextRun } from "../utils/recurringBillSplitScheduler.js";

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

// List recurring bill split schedules for the authenticated user
router.get("/", authenticate, async (req, res) => {
  try {
    const schedules = await req.prisma.recurringBillSplit.findMany({
      where: { billSplit: { createdBy: req.user.id } },
      include: { billSplit: true },
    });
    res.json(schedules);
  } catch (error) {
    console.error("Get recurring bill splits error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create a recurring schedule for an existing bill split
router.post("/", authenticate, async (req, res) => {
  try {
    const { billSplitId, frequency, day, dayOfWeek } = req.body;

    const dayValue =
      frequency === "weekly"
        ? (dayOfWeekMap[dayOfWeek?.toLowerCase?.()] ?? 0)
        : day;

    const billSplit = await req.prisma.billSplit.findUnique({
      where: { id: billSplitId },
      select: { createdBy: true },
    });
    if (!billSplit || billSplit.createdBy !== req.user.id) {
      return res.status(404).json({ error: "Bill split not found" });
    }

    const nextRun = computeNextRun(frequency, dayValue);
    const schedule = await req.prisma.recurringBillSplit.create({
      data: { billSplitId, frequency, day: dayValue, nextRun },
    });

    await req.prisma.billSplit.update({
      where: { id: billSplitId },
      data: { isRecurring: true },
    });

    res.status(201).json(schedule);
  } catch (error) {
    console.error("Create recurring bill split error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update an existing recurring schedule
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await req.prisma.recurringBillSplit.findUnique({
      where: { id },
      include: { billSplit: { select: { createdBy: true } } },
    });
    if (!existing || existing.billSplit.createdBy !== req.user.id) {
      return res.status(404).json({ error: "Recurring bill split not found" });
    }

    const {
      frequency = existing.frequency,
      day = existing.day,
      dayOfWeek,
    } = req.body;
    const dayValue =
      frequency === "weekly"
        ? (dayOfWeekMap[dayOfWeek?.toLowerCase?.()] ?? day)
        : day;
    const nextRun = computeNextRun(frequency, dayValue);
    const schedule = await req.prisma.recurringBillSplit.update({
      where: { id },
      data: { frequency, day: dayValue, nextRun },
    });
    res.json(schedule);
  } catch (error) {
    console.error("Update recurring bill split error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel a recurring schedule
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await req.prisma.recurringBillSplit.findUnique({
      where: { id },
      include: { billSplit: { select: { createdBy: true, id: true } } },
    });
    if (!existing || existing.billSplit.createdBy !== req.user.id) {
      return res.status(404).json({ error: "Recurring bill split not found" });
    }

    await req.prisma.recurringBillSplit.delete({ where: { id } });
    await req.prisma.billSplit.update({
      where: { id: existing.billSplit.id },
      data: { isRecurring: false },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete recurring bill split error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
