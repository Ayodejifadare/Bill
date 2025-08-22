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

function getInitials(name = '') {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

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

  const pendingBills = userId
    ? await prisma.billSplitParticipant.count({
        where: {
          userId,
          isPaid: false,
          billSplit: { groupId: group.id }
        }
      })
    : 0

  const memberPreview = group.members.slice(0, 3).map((m) => ({
    name: m.user.name,
    avatar: getInitials(m.user.name)
  }))

  return {
    id: group.id,
    name: group.name,
    description: group.description || '',
    memberCount: group.members.length,
    totalSpent,
    recentActivity: lastActive ? `Last activity on ${lastActive.toISOString()}` : '',
    members: memberPreview,
    isAdmin: userId
      ? group.members.some((m) => m.userId === userId && m.role === 'ADMIN')
      : false,
    lastActive: lastActive ? lastActive.toISOString() : '',
    pendingBills,
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
router.post('/', authenticate, async (req, res) => {
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

    // Add the creator as an admin
    await req.prisma.groupMember.create({
      data: { groupId: group.id, userId: req.user.id, role: 'ADMIN' }
    })

    if (Array.isArray(memberIds)) {
      const otherMemberIds = memberIds.filter((id) => id !== req.user.id)
      if (otherMemberIds.length > 0) {
        await req.prisma.groupMember.createMany({
          data: otherMemberIds.map((userId) => ({
            groupId: group.id,
            userId,
            role: 'MEMBER'
          }))
        })
      }
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

    const formattedGroup = await formatGroup(
      req.prisma,
      fullGroup,
      req.user.id
    )

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
    // ensure member count reflects new membership
    formatted.memberCount = updated.members.length

    res.json({ group: formatted })
  } catch (error) {
    console.error('Join group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /:groupId/leave - remove current user from group
router.post('/:groupId/leave', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params
    const userId = req.user.id

    // Ensure group exists and user is a member
    const membership = await req.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    })
    if (!membership) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Remove the member
    await req.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } }
    })

    // Check remaining members for admin role
    const remainingMembers = await req.prisma.groupMember.findMany({
      where: { groupId },
      orderBy: { joinedAt: 'asc' }
    })

    if (remainingMembers.length > 0) {
      const hasAdmin = remainingMembers.some((m) => m.role === 'ADMIN')
      if (!hasAdmin) {
        // Promote earliest remaining member to admin
        await req.prisma.groupMember.update({
          where: {
            groupId_userId: {
              groupId,
              userId: remainingMembers[0].userId
            }
          },
          data: { role: 'ADMIN' }
        })
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Leave group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /:groupId - get group details with members and recent transactions
router.get('/:groupId', authenticate, async (req, res) => {
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

    // Ensure requesting user is a group member
    const isMember = group.members.some((m) => m.userId === req.user.id)
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' })
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

    // Calculate balances and total spent
    const stats = {}
    memberIds.forEach((id) => {
      stats[id] = { totalSpent: 0, balance: 0 }
    })

    const allTransactions = await req.prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: { in: memberIds } },
          { receiverId: { in: memberIds } }
        ]
      },
      select: { senderId: true, receiverId: true, amount: true }
    })

    let totalSpent = 0
    allTransactions.forEach((t) => {
      if (stats[t.senderId]) {
        stats[t.senderId].totalSpent += t.amount
        stats[t.senderId].balance -= t.amount
      }
      if (stats[t.receiverId]) {
        stats[t.receiverId].balance += t.amount
      }
      if (stats[t.senderId] || stats[t.receiverId]) {
        totalSpent += t.amount
      }
    })

    const formattedGroup = {
      id: group.id,
      name: group.name,
      description: group.description || '',
      totalSpent,
      totalMembers: group.members.length,
      isAdmin: group.members.some(
        (m) => m.userId === req.user.id && m.role === 'ADMIN'
      ),
      createdDate: group.createdAt.toISOString(),
      color: group.color || '',
      members: group.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar || '',
        email: m.user.email,
        isAdmin: m.role === 'ADMIN',
        balance: stats[m.userId]?.balance || 0,
        totalSpent: stats[m.userId]?.totalSpent || 0,
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
        participants: [
          t.sender?.name || t.senderId,
          t.receiver?.name || t.receiverId
        ]
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
router.post('/:groupId/potential-members', authenticate, async (req, res) => {
  try {
    const contacts = Array.isArray(req.body.contacts) ? req.body.contacts : []
    const userId = req.user.id

    // Preload current user's friendships for mutual friend calculation
    const myFriendships = await req.prisma.friendship.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }]
      },
      select: { user1Id: true, user2Id: true }
    })
    const myFriendIds = new Set(
      myFriendships.map((f) => (f.user1Id === userId ? f.user2Id : f.user1Id))
    )

    const formatted = await Promise.all(
      contacts.map(async (c) => {
        const phone =
          c.phone || c.phoneNumber || c.phoneNumbers?.[0] || undefined
        const email = c.email || c.emails?.[0] || undefined

        let user = null
        if (phone) {
          user = await req.prisma.user.findFirst({
            where: { phone }
          })
        }
        if (!user && email) {
          user = await req.prisma.user.findFirst({
            where: { email }
          })
        }

        const base = {
          id: c.id,
          name: c.name,
          phoneNumber: phone || '',
          email: email || '',
          status: 'not_on_app',
          isInGroup: false,
          isFriend: false,
          mutualFriends: 0
        }

        if (!user) {
          return base
        }

        base.userId = user.id
        base.status = 'existing_user'

        // Check group membership
        const membership = await req.prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId: req.params.groupId, userId: user.id } }
        })
        base.isInGroup = Boolean(membership)

        // Determine friendship status
        const friendship = await req.prisma.friendship.findFirst({
          where: {
            OR: [
              { user1Id: userId, user2Id: user.id },
              { user1Id: user.id, user2Id: userId }
            ]
          }
        })
        if (friendship) {
          base.status = 'friends'
          base.isFriend = true
        } else {
          const pendingRequest = await req.prisma.friendRequest.findFirst({
            where: {
              OR: [
                { senderId: userId, receiverId: user.id },
                { senderId: user.id, receiverId: userId }
              ],
              status: 'PENDING'
            }
          })
          if (pendingRequest) {
            base.status = 'pending'
          }
        }

        // Mutual friends
        const contactFriendships = await req.prisma.friendship.findMany({
          where: {
            OR: [{ user1Id: user.id }, { user2Id: user.id }]
          },
          select: { user1Id: true, user2Id: true }
        })
        const contactFriendIds = contactFriendships.map((f) =>
          f.user1Id === user.id ? f.user2Id : f.user1Id
        )
        base.mutualFriends = contactFriendIds.filter((id) =>
          myFriendIds.has(id)
        ).length

        return base
      })
    )

    res.json({ contacts: formatted })
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

