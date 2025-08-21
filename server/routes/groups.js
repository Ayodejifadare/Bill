import express from 'express'
import groupAccountRouter from './groupAccounts.js'
import groupMemberRouter from './groupMembers.js'
import groupInviteRouter from './groupInvites.js'
import groupInviteLinkRouter from './groupInviteLinks.js'
import groupTransactionRouter from './groupTransactions.js'
import {
  TRANSACTION_TYPE_MAP,
  TRANSACTION_STATUS_MAP
} from '../../shared/transactions.js'
import authenticate from '../middleware/auth.js'

const router = express.Router()

// Helper to format group information with aggregates
async function formatGroup(prisma, group, userId) {
  const memberIds = group.members.map((m) => m.userId)

  let totalSpent = 0
  let lastActive = null

  if (memberIds.length > 0) {
    const aggregates = await prisma.transaction.aggregate({
      where: {
        OR: [
          { senderId: { in: memberIds } },
          { receiverId: { in: memberIds } }
        ]
      },
      _sum: { amount: true },
      _max: { createdAt: true }
    })

    totalSpent = aggregates._sum.amount || 0
    lastActive = aggregates._max.createdAt
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description || '',
    memberCount: group.members.length,
    totalSpent,
    recentActivity: lastActive ? `Last activity on ${lastActive.toISOString()}` : '',
    members: group.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      avatar: m.user.avatar || ''
    })),
    isAdmin: userId
      ? group.members.some((m) => m.userId === userId && m.role === 'ADMIN')
      : false,
    lastActive: lastActive ? lastActive.toISOString() : '',
    pendingBills: 0,
    color: group.color || ''
  }
}

// GET / - list all groups with member details and aggregates
router.get('/', authenticate, async (req, res) => {
  try {
    const groups = await req.prisma.group.findMany({
      where: {
        members: { some: { userId: req.user.id } }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          }
        }
      }
    })

    const formatted = await Promise.all(
      groups.map((g) => formatGroup(req.prisma, g, req.user.id))
    )

    res.json({ groups: formatted })
  } catch (error) {
    console.error('List groups error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST / - create a new group
router.post('/', async (req, res) => {
  try {
    const { name, description, color, memberIds } = req.body || {}

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' })
    }

    if (memberIds !== undefined) {
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res
          .status(400)
          .json({ error: 'memberIds must be a non-empty array' })
      }

      const validCount = await req.prisma.user.count({
        where: { id: { in: memberIds } }
      })

      if (validCount !== memberIds.length) {
        return res
          .status(400)
          .json({ error: 'All memberIds must correspond to existing users' })
      }
    }

    const group = await req.prisma.group.create({
      data: { name, description, color }
    })

    if (Array.isArray(memberIds)) {
      await req.prisma.groupMember.createMany({
        data: memberIds.map((userId) => ({ groupId: group.id, userId }))
      })
    }

    const fullGroup = await req.prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    })

    const formattedGroup = await formatGroup(req.prisma, fullGroup)

    res.status(201).json({ group: formattedGroup })
  } catch (error) {
    console.error('Create group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /:groupId/join - add current user to group
router.post('/:groupId/join', authenticate, async (req, res) => {
  try {
    const group = await req.prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    })
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const userId = req.user.id

    await req.prisma.groupMember.upsert({
      where: {
        groupId_userId: { groupId: group.id, userId }
      },
      update: {},
      create: { groupId: group.id, userId }
    })

    const updated = await req.prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    })

    const formatted = await formatGroup(req.prisma, updated, userId)

    res.json({ group: formatted })
  } catch (error) {
    console.error('Join group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /:groupId/leave - remove current user from group
router.post('/:groupId/leave', authenticate, async (req, res) => {
  try {
    const group = await req.prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: { members: true }
    })
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }
    const userId = req.user.id

    await req.prisma.groupMember.deleteMany({
      where: { groupId: group.id, userId }
    })

    const updated = await req.prisma.group.findUnique({
      where: { id: group.id },
      include: { members: true }
    })

    res.json({
      group: {
        id: updated.id,
        name: updated.name,
        members: updated.members.map((m) => m.userId)
      }
    })
  } catch (error) {
    console.error('Leave group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /:groupId - get group details with members and recent transactions
router.get('/:groupId', async (req, res) => {
  try {
    const group = await req.prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    })

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const memberIds = group.members.map((m) => m.userId)
    const pageSize = 10
    let transactions = await req.prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: { in: memberIds } },
          { receiverId: { in: memberIds } }
        ]
      },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize + 1
    })

    let hasMoreTransactions = false
    if (transactions.length > pageSize) {
      transactions.pop()
      hasMoreTransactions = true
    }

      const formattedGroup = {
        id: group.id,
        name: group.name,
        description: group.description || '',
        totalSpent: 0,
        totalMembers: group.members.length,
        isAdmin: false,
        createdDate: group.createdAt.toISOString(),
        color: group.color || '',
        members: group.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          avatar: m.user.avatar || '',
        email: m.user.email,
        isAdmin: false,
        balance: 0,
        totalSpent: 0,
        joinedDate: m.joinedAt.toISOString()
      })),
      recentTransactions: transactions.map((t) => ({
        id: t.id,
        type: TRANSACTION_TYPE_MAP[t.type] || t.type,
        amount: t.amount,
        description: t.description || '',
        date: t.createdAt.toISOString(),
        status: TRANSACTION_STATUS_MAP[t.status] || t.status,
        paidBy: t.sender?.name || t.senderId,
        participants: [t.sender?.name || t.senderId, t.receiver?.name || t.receiverId]
      })),
      hasMoreTransactions
    }

    res.json({ group: formattedGroup })
  } catch (error) {
    console.error('Get group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Potential members from contact sync
router.post('/:groupId/potential-members', async (req, res) => {
  try {
    const contacts = (req.body.contacts || []).map((c) => ({
      id: c.id,
      name: c.name,
      phoneNumber: c.phoneNumbers?.[0] || c.phone || '',
      status: 'existing_user'
    }))
    res.json({ contacts })
  } catch (error) {
    console.error('Potential members error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Invite contacts to group
router.post('/:groupId/invite', async (req, res) => {
  try {
    const { method, contacts = [], contact } = req.body || {}
    const items = contacts.length ? contacts : contact ? [contact] : []
    const now = Date.now()
    await Promise.all(
      items.map((c) =>
        req.prisma.groupInvite.create({
          data: {
            groupId: req.params.groupId,
            name: c.name,
            contact: c.phone || c.email || c.phoneNumber || '',
            method,
            invitedBy: req.headers['x-user-id'] || 'system',
            expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000)
          }
        })
      )
    )
    res.json({ message: 'Invites sent' })
  } catch (error) {
    console.error('Invite members error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Mount sub-routers for group operations
router.use('/:groupId/members', groupMemberRouter)
router.use('/:groupId/invites', groupInviteRouter)
router.use('/:groupId/invite-links', groupInviteLinkRouter)
router.use('/:groupId/accounts', groupAccountRouter)
router.use('/:groupId', groupTransactionRouter)

export default router

