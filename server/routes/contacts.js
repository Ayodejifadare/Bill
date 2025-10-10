import express from "express";
import authenticate from "../middleware/auth.js";
import { buildPhoneVariants } from "../utils/phone.js";

const router = express.Router();

// Ensure all routes require authentication
router.use(authenticate);

const MAX_CONTACTS = Number(process.env.CONTACT_MATCH_MAX || 2000);

// Match provided contacts against existing users
router.post("/match", async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts)) {
      return res.status(400).json({ error: "Invalid contacts format" });
    }

    if (contacts.length > MAX_CONTACTS) {
      return res
        .status(400)
        .json({
          error: `Too many contacts submitted. Maximum supported is ${MAX_CONTACTS}.`,
        });
    }

    let region = "US";
    try {
      const currentUser = await req.prisma.user.findUnique({
        where: { id: req.userId },
        select: { region: true },
      });
      if (currentUser?.region) {
        region = String(currentUser.region).toUpperCase();
      }
    } catch (err) {
      console.warn(
        "Failed to determine user region for contact match:",
        err?.message,
      );
    }

    const emails = new Set();
    const phones = new Set();

    contacts.forEach((c) => {
      if (Array.isArray(c.emails)) {
        c.emails.forEach((e) => {
          if (typeof e === "string" && e.trim()) {
            emails.add(e.trim().toLowerCase());
          }
        });
      } else if (typeof c.email === "string" && c.email.trim()) {
        emails.add(c.email.trim().toLowerCase());
      }

      if (Array.isArray(c.phoneNumbers)) {
        c.phoneNumbers.forEach((p) => {
          if (typeof p === "string" && p.trim()) {
            buildPhoneVariants(p, region).forEach((v) => phones.add(v));
          }
        });
      } else if (typeof c.phone === "string" && c.phone.trim()) {
        buildPhoneVariants(c.phone, region).forEach((v) => phones.add(v));
      } else if (typeof c.phoneNumber === "string" && c.phoneNumber.trim()) {
        buildPhoneVariants(c.phoneNumber, region).forEach((v) => phones.add(v));
      }
    });

    const whereClauses = [];
    if (emails.size > 0) {
      whereClauses.push({ email: { in: Array.from(emails) } });
    }
    if (phones.size > 0) {
      whereClauses.push({ phone: { in: Array.from(phones) } });
    }

    if (whereClauses.length === 0) {
      return res.json({ contacts: [] });
    }

    const [friendships, outgoingRequests] = await Promise.all([
      req.prisma.friendship.findMany({
        where: {
          OR: [{ user1Id: req.userId }, { user2Id: req.userId }],
        },
        select: { user1Id: true, user2Id: true },
      }),
      req.prisma.friendRequest.findMany({
        where: {
          senderId: req.userId,
          status: "PENDING",
        },
        select: { receiverId: true },
      }),
    ]);

    const excludedIds = new Set([req.userId]);
    friendships.forEach((f) => {
      excludedIds.add(f.user1Id === req.userId ? f.user2Id : f.user1Id);
      excludedIds.add(f.user1Id);
      excludedIds.add(f.user2Id);
    });
    outgoingRequests.forEach((r) => excludedIds.add(r.receiverId));

    const where = {
      OR: whereClauses,
      NOT:
        Array.from(excludedIds).length > 0
          ? { id: { in: Array.from(excludedIds) } }
          : undefined,
    };

    const users = await req.prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, avatar: true },
    });

    const matched = users.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      username: u.email,
      avatar: u.avatar,
      status: "existing_user",
    }));

    res.json({ contacts: matched });
  } catch (error) {
    console.error("Match contacts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
