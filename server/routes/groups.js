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

// GET / - list all groups with member details and aggregates
router.get('/', async (req, res) => {
  try {
    const groups = await req.prisma.group.findMany({
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
      groups.map(async (g) => {
        const memberIds = g.members.map((m) => m.userId)

        const aggregates = await req.prisma.transaction.aggregate({
          where: {
            OR: [
              { senderId: { in: memberIds } },
              { receiverId: { in: memberIds } }
            ]
          },
          _sum: { amount: true },
          _max: { createdAt: true }
        })

        const totalSpent = aggregates._sum.amount || 0
        const lastActive = aggregates._max.createdAt

        return {
          id: g.id,
          name: g.name,
          description: '',
          memberCount: g.members.length,
          totalSpent,
          recentActivity: lastActive
            ? `Last activity on ${lastActive.toISOString()}`
            : '',
          members: g.members.map((m) => ({
            name: m.user.name,
            avatar: m.user.avatar || ''
          })),
          isAdmin: false,
          lastActive: lastActive ? lastActive.toISOString() : '',
          pendingBills: 0,
          color: ''
        }
      })
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
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' })
    }

    const group = await req.prisma.group.create({
      data: { name }
    })

    res.status(201).json({ group: { ...group, members: [] } })
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
      include: { members: true }
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
      color: '',
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

