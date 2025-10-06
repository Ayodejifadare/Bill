import express from 'express'
import { formatDistanceToNow } from 'date-fns'
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

const COLOR_CLASS_MAP = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  teal: 'bg-teal-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500'
}

function mapColor(color = '') {
  const clr = color || ''
  if (clr.startsWith('bg-')) return clr
  const key = clr.toLowerCase()
  return COLOR_CLASS_MAP[key] || COLOR_CLASS_MAP.blue
}

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
    const txAgg = await prisma.transaction.aggregate({
      where: {
        OR: [
          { senderId: { in: memberIds } },
          { receiverId: { in: memberIds } }
        ]
      },
      _sum: { amount: true },
      _max: { createdAt: true }
    })

    totalSpent += txAgg._sum.amount || 0
    lastActive = txAgg._max.createdAt

    const billSplits = await prisma.billSplit.findMany({
      where: { groupId: group.id },
      select: {
        createdAt: true,
        participants: { select: { amount: true } }
      }
    })

    billSplits.forEach((bs) => {
      bs.participants.forEach((p) => {
        totalSpent += p.amount
      })
      if (!lastActive || bs.createdAt > lastActive) {
        lastActive = bs.createdAt
      }
    })
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

  const memberPreview = group.members
    .slice(0, 3)
    .map((m) => getInitials(m.user.name))

  return {
    id: group.id,
    name: group.name,
    description: group.description || '',
    memberCount: group.members.length,
    totalSpent,
    recentActivity: lastActive
      ? formatDistanceToNow(lastActive, { addSuffix: true })
      : '',
    members: memberPreview,
    isAdmin: userId
      ? group.members.some((m) => m.userId === userId && m.role === 'ADMIN')
      : false,
    lastActive: lastActive ? lastActive.toISOString() : null,
    pendingBills,
    color: mapColor(group.color)
  }
}

// GET / - list all groups with member details and aggregates
router.get('/', authenticate, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100)
    const skip = (page - 1) * pageSize

    const groups = await req.prisma.group.findMany({
      where: {
        members: { some: { userId: req.user.id } }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true, phone: true } }
          }
        }
      },
      skip,
      take: pageSize + 1
    })

    const hasMore = groups.length > pageSize
    if (hasMore) groups.pop()

    // Enrich with aggregates for UI summaries
    const formatted = await Promise.all(
      groups.map(async (g) => {
        const fg = await formatGroup(req.prisma, g, req.user.id)

        // Derive a human-friendly recent activity description and a relative lastActive
        const memberIds = g.members.map((m) => m.userId)

        const [tx] = memberIds.length
          ? await req.prisma.transaction.findMany({
              where: {
                OR: [
                  { senderId: { in: memberIds } },
                  { receiverId: { in: memberIds } }
                ]
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true, description: true, type: true }
            })
          : []

        const bill = await req.prisma.billSplit.findFirst({
          where: { groupId: g.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, title: true }
        })

        let lastDate = null
        let recentActivity = ''
        if (tx && bill) {
          if (tx.createdAt > bill.createdAt) {
            lastDate = tx.createdAt
            recentActivity = tx.description || 'Transfer'
          } else {
            lastDate = bill.createdAt
            recentActivity = bill.title || 'Group bill split'
          }
        } else if (tx) {
          lastDate = tx.createdAt
          recentActivity = tx.description || 'Transfer'
        } else if (bill) {
          lastDate = bill.createdAt
          recentActivity = bill.title || 'Group bill split'
        }

        const lastActiveRelative = lastDate
          ? formatDistanceToNow(lastDate, { addSuffix: true })
          : ''

        return {
          id: fg.id,
          name: fg.name,
          description: fg.description,
          memberCount: g.members.length,
          totalSpent: fg.totalSpent || 0,
          // Show description/title of most recent activity
          recentActivity,
          // Initials preview for compact UI
          members: g.members.map((m) => getInitials(m.user.name)),
          isAdmin: fg.isAdmin || false,
          // Relative time for header subtitle
          lastActive: lastActiveRelative,
          pendingBills: fg.pendingBills || 0,
          color: fg.color
        }
      })
    )

    res.json({ groups: formatted, nextPage: hasMore ? page + 1 : null })
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
      if (!Array.isArray(memberIds)) {
        return res
          .status(400)
          .json({ error: 'memberIds must be an array if provided' })
      }

      // If provided but empty, treat as no additional members and skip validation
      if (memberIds.length > 0) {
        const validCount = await req.prisma.user.count({
          where: { id: { in: memberIds } }
        })

        if (validCount !== memberIds.length) {
          return res
            .status(400)
            .json({ error: 'All memberIds must correspond to existing users' })
        }
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
            user: { select: { id: true, name: true, avatar: true, phone: true } }
          }
        }
      }
    })

    const formattedGroup = await formatGroup(
      req.prisma,
      fullGroup,
      req.user.id
    )
    // Return full member objects so the client can immediately navigate
    // to the group detail view with member information available.
    formattedGroup.members = fullGroup.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      avatar: m.user.avatar || '',
      phoneNumber: m.user.phone || ''
    }))

    res.status(201).json({ group: formattedGroup })
  } catch (error) {
    console.error('Create group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /:groupId - update group details (admin only)
router.patch('/:groupId', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params
    const { name, description, color } = req.body || {}

    const group = await req.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true }
    })
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const me = group.members.find((m) => m.userId === req.user.id)
    if (!me || me.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can edit the group' })
    }

    const updates = {}
    if (typeof name === 'string' && name.trim()) updates.name = name.trim()
    if (typeof description === 'string') updates.description = description
    if (typeof color === 'string' && color.trim()) updates.color = color.trim()

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    await req.prisma.group.update({ where: { id: groupId }, data: updates })

    const updated = await req.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatar: true, phone: true } } } }
      }
    })
    const formatted = await formatGroup(req.prisma, updated, req.user.id)
    formatted.members = updated.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      avatar: m.user.avatar || '',
      phoneNumber: m.user.phone || ''
    }))

    res.json({ group: formatted })
  } catch (error) {
    console.error('Update group error:', error)
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

// GET /:groupId - get group details with membership check and aggregates
router.get('/:groupId', authenticate, async (req, res) => {
  try {
    const group = await req.prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, phone: true, email: true }
            }
          }
        }
      }
    })

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    // Verify requesting user is a member
    const isMember = group.members.some((m) => m.userId === req.user.id)
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const prisma = req.prisma
    const userId = req.user.id

    // Base aggregates (totalSpent, isAdmin, color, etc.)
    const base = await formatGroup(prisma, group, userId)

    // Compute per-member balances and per-member total spent within this group
    const memberIds = group.members.map((m) => m.userId)

    // Load all bill splits for this group with participants
    const billSplits = await prisma.billSplit.findMany({
      where: { groupId: group.id },
      include: { participants: true }
    })

    const memberBalanceMap = new Map()
    const memberSpentMap = new Map()
    for (const m of group.members) {
      memberBalanceMap.set(m.userId, 0)
      memberSpentMap.set(m.userId, 0)
    }

    for (const bs of billSplits) {
      // Payer lays out the total
      if (memberSpentMap.has(bs.createdBy)) {
        memberSpentMap.set(bs.createdBy, memberSpentMap.get(bs.createdBy) + Number(bs.totalAmount || 0))
      }
      for (const p of bs.participants) {
        // Each participant is responsible for their share
        if (memberSpentMap.has(p.userId)) {
          memberSpentMap.set(p.userId, memberSpentMap.get(p.userId) + Number(p.amount || 0))
        }
        // Outstanding balance: participants owe payer until paid
        if (p.userId !== bs.createdBy && p.isPaid === false) {
          if (memberBalanceMap.has(bs.createdBy)) {
            memberBalanceMap.set(bs.createdBy, memberBalanceMap.get(bs.createdBy) + Number(p.amount || 0))
          }
          if (memberBalanceMap.has(p.userId)) {
            memberBalanceMap.set(p.userId, memberBalanceMap.get(p.userId) - Number(p.amount || 0))
          }
        }
      }
    }

    // Recent activity (first page), consistent with groupTransactions router
    const pageSize = 10
    const transactions = await prisma.transaction.findMany({
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
    const hasMore = transactions.length > pageSize
    const recentSlice = transactions.slice(0, pageSize)
    const recentTransactions = recentSlice.map((t) => ({
      id: t.id,
      type: TRANSACTION_TYPE_MAP[t.type] || t.type,
      amount: t.amount,
      description: t.description || '',
      date: t.createdAt.toISOString(),
      status: TRANSACTION_STATUS_MAP[t.status] || t.status,
      paidBy: t.sender?.name || t.senderId,
      participants: [t.sender?.name || t.senderId, t.receiver?.name || t.receiverId]
    }))

    // Build members array enriched with balance/totalSpent
    const members = group.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      avatar: m.user.avatar || getInitials(m.user.name),
      email: m.user.email || '',
      isAdmin: m.role === 'ADMIN',
      balance: Number(memberBalanceMap.get(m.userId) || 0),
      totalSpent: Number(memberSpentMap.get(m.userId) || 0),
      joinedDate: m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
    }))

    const response = {
      id: base.id,
      name: base.name,
      description: base.description,
      totalSpent: base.totalSpent,
      totalMembers: group.members.length,
      isAdmin: base.isAdmin,
      createdDate: group.createdAt ? group.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      color: base.color,
      members,
      recentTransactions,
      hasMoreTransactions: hasMore
    }

    res.json({ group: response })
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
