import express from "express";
import authenticate from "../middleware/auth.js";
import { requireGroupMember, requireGroupAdmin } from "../utils/permissions.js";

// Use mergeParams to access groupId from parent router
const router = express.Router({ mergeParams: true });

router.use(authenticate);

// GET / - list members of a group
router.get("/", requireGroupMember, async (req, res) => {
  try {
    const members = await req.prisma.groupMember.findMany({
      where: { groupId: req.params.groupId },
      include: { user: true },
    });

    const formattedMembers = members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      username: `@${m.user.email.split("@")[0]}`,
      avatar: m.user.avatar || "",
      role: m.role === "ADMIN" ? "admin" : "member",
      joinedAt: m.joinedAt.toISOString(),
      lastActive: "now",
      totalSpent: 0,
      totalOwed: 0,
      isYou: m.user.id === req.user.id,
      status: "active",
      permissions: {
        canAddMembers: m.role === "ADMIN",
        canRemoveMembers: m.role === "ADMIN",
        canCreateSplits: true,
        canEditGroup: m.role === "ADMIN",
      },
    }));

    const invites = await req.prisma.groupInvite.findMany({
      where: { groupId: req.params.groupId, status: "sent" },
    });

    const formattedInvites = invites.map((i) => ({
      id: i.id,
      name: i.name || "",
      username: i.contact.includes("@")
        ? `@${i.contact.split("@")[0]}`
        : i.contact,
      invitedBy: i.invitedBy,
      invitedAt: i.invitedAt.toISOString(),
      method: i.method,
      role: "member",
      joinedAt: i.invitedAt.toISOString(),
      lastActive: "",
      totalSpent: 0,
      totalOwed: 0,
      isYou: false,
      status: "pending",
      permissions: {
        canAddMembers: false,
        canRemoveMembers: false,
        canCreateSplits: false,
        canEditGroup: false,
      },
    }));

    res.json({ members: [...formattedMembers, ...formattedInvites] });
  } catch (error) {
    console.error("List group members error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /:memberId - remove member from group
router.delete("/:memberId", requireGroupAdmin, async (req, res) => {
  try {
    await req.prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId: req.params.groupId,
          userId: req.params.memberId,
        },
      },
    });
    res.json({ message: "Removed" });
  } catch (error) {
    console.error("Remove group member error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /:memberId/promote - make member admin
router.post("/:memberId/promote", requireGroupAdmin, async (req, res) => {
  try {
    const member = await req.prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: req.params.groupId,
          userId: req.params.memberId,
        },
      },
      data: { role: "ADMIN" },
    });
    res.json({ member });
  } catch (error) {
    console.error("Promote group member error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /:memberId/demote - make admin a regular member
router.post("/:memberId/demote", requireGroupAdmin, async (req, res) => {
  try {
    const member = await req.prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: req.params.groupId,
          userId: req.params.memberId,
        },
      },
      data: { role: "MEMBER" },
    });
    res.json({ member });
  } catch (error) {
    console.error("Demote group member error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
