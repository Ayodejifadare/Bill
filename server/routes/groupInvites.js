import express from "express";
import { createNotification } from "../utils/notifications.js";
import authenticate from "../middleware/auth.js";
import { requireGroupAdmin } from "../utils/permissions.js";

const router = express.Router({ mergeParams: true });

// All group invite routes require auth and admin access
router.use(authenticate);
router.use(requireGroupAdmin);

// GET / - list invites for a group
router.get("/", async (req, res) => {
  try {
    const invites = await req.prisma.groupInvite.findMany({
      where: { groupId: req.params.groupId },
    });

    const formatted = invites.map((i) => ({
      id: i.id,
      name: i.name || "",
      contact: i.contact,
      method: i.method,
      invitedBy: i.invitedBy,
      invitedAt: i.invitedAt.toISOString(),
      status: i.status,
      expiresAt: i.expiresAt.toISOString(),
      attempts: i.attempts,
      lastAttempt: i.lastAttempt ? i.lastAttempt.toISOString() : undefined,
    }));

    res.json({ invites: formatted });
  } catch (error) {
    console.error("List group invites error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /:inviteId/resend - increment attempts and update status
router.post("/:inviteId/resend", async (req, res) => {
  try {
    const existing = await req.prisma.groupInvite.findUnique({
      where: { id: req.params.inviteId },
      include: { group: true },
    });
    if (!existing || existing.groupId !== req.params.groupId) {
      return res.status(404).json({ error: "Invite not found" });
    }
    const invite = await req.prisma.groupInvite.update({
      where: { id: existing.id },
      data: {
        attempts: { increment: 1 },
        status: "delivered",
        lastAttempt: new Date(),
      },
      include: { group: true },
    });

    const user = await req.prisma.user.findFirst({
      where: {
        OR: [{ email: invite.contact }, { phone: invite.contact }],
      },
    });

    if (user) {
      await createNotification(req.prisma, {
        recipientId: user.id,
        actorId: invite.invitedBy,
        type: "group_invite_resend",
        title: "Group invite",
        message: `You have been invited to join ${invite.group.name}`,
        actionable: true,
      });
    }
    const formatted = {
      id: invite.id,
      name: invite.name || "",
      contact: invite.contact,
      method: invite.method,
      invitedBy: invite.invitedBy,
      invitedAt: invite.invitedAt.toISOString(),
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      attempts: invite.attempts,
      lastAttempt: invite.lastAttempt?.toISOString(),
    };
    res.json({ invite: formatted });
  } catch (error) {
    console.error("Resend invite error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /:inviteId - remove invite
router.delete("/:inviteId", async (req, res) => {
  try {
    const existing = await req.prisma.groupInvite.findUnique({
      where: { id: req.params.inviteId },
    });
    if (!existing || existing.groupId !== req.params.groupId) {
      return res.status(404).json({ error: "Invite not found" });
    }
    await req.prisma.groupInvite.delete({ where: { id: existing.id } });
    res.json({});
  } catch (error) {
    console.error("Delete invite error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
