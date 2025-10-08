import express from 'express'
import { body, validationResult } from 'express-validator'

import { TRANSACTION_TYPE_MAP, TRANSACTION_STATUS_MAP } from '../../shared/transactions.js'

import { createNotification } from '../utils/notifications.js'
import authenticate from '../middleware/auth.js'


const router = express.Router()

router.use(authenticate)

// Get user's friends
router.get('/', async (req, res) => {
  try {
    const friendships = await req.prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: req.userId },
          { user2Id: req.userId }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, email: true, avatar: true, phone: true } },
        user2: { select: { id: true, name: true, email: true, avatar: true, phone: true } }
      }
    })

    const [incomingRequests, outgoingRequests] = await Promise.all([
      req.prisma.friendRequest.findMany({
        where: { receiverId: req.userId, status: 'PENDING' },
        include: {
          sender: { select: { id: true, name: true, email: true, avatar: true, phone: true } },
          receiver: { select: { id: true, name: true, email: true, avatar: true, phone: true } }
        }
      }),
      req.prisma.friendRequest.findMany({
        where: { senderId: req.userId, status: 'PENDING' },
        include: {
          sender: { select: { id: true, name: true, email: true, avatar: true, phone: true } },
          receiver: { select: { id: true, name: true, email: true, avatar: true, phone: true } }
        }
      })
    ])

    const friends = friendships.map(friendship => {
      const friend =
        friendship.user1Id === req.userId ? friendship.user2 : friendship.user1

      return {
        id: friend.id,
        name: friend.name,
        avatar: friend.avatar,
        email: friend.email,
        // Align with client expectation: expose an explicit status
        status: 'active',
        phoneNumber: friend.phone
      }
    })

    const pendingRequests = [
      ...incomingRequests.map(request => ({
        id: request.sender.id,
        name: request.sender.name,
        avatar: request.sender.avatar,
        email: request.sender.email,
        status: 'pending',
        requestId: request.id,
        direction: 'incoming',
        phoneNumber: request.sender.phone
      })),
      ...outgoingRequests.map(request => ({
        id: request.receiver.id,
        name: request.receiver.name,
        avatar: request.receiver.avatar,
        email: request.receiver.email,
        status: 'pending',
        requestId: request.id,
        direction: 'outgoing',
        phoneNumber: request.receiver.phone
      }))
    ]

    res.json({ friends: [...friends, ...pendingRequests] })
  } catch (error) {
    console.error('Get friends error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Search friends
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query

    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.status(400).json({ error: 'Search query is required' })
    }

    const query = q.trim()

    const friendships = await req.prisma.friendship.findMany({
      take: 20,
      where: {
        OR: [
          {
            user1Id: req.userId,
            user2: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query, mode: 'insensitive' } }
              ]
            }
          },
          {
            user2Id: req.userId,
            user1: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { phone: { contains: query, mode: 'insensitive' } }
              ]
            }
          }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, email: true, avatar: true, phone: true } },
        user2: { select: { id: true, name: true, email: true, avatar: true, phone: true } }
      }
    })

    const friends = friendships.map(f => {
      const friend = f.user1Id === req.userId ? f.user2 : f.user1
      return {
        id: friend.id,
        name: friend.name,
        avatar: friend.avatar,
        email: friend.email,
        status: 'active',
        phoneNumber: friend.phone
      }
    })

    res.json({ friends })
  } catch (error) {
    console.error('Search friends error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Send friend request
router.post('/request', [
  body('receiverId').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { receiverId } = req.body

    if (receiverId === req.userId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' })
    }

    // Check if receiver exists
    const receiver = await req.prisma.user.findUnique({
      where: { id: receiverId }
    })

    if (!receiver) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if already friends or request exists
    const existingFriendship = await req.prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: req.userId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: req.userId }
        ]
      }
    })

    if (existingFriendship) {
      return res.status(400).json({ error: 'Already friends' })
    }

    const existingRequest = await req.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: req.userId, receiverId },
          { senderId: receiverId, receiverId: req.userId }
        ],
        status: 'PENDING'
      }
    })

    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already exists' })
    }

    // Create friend request
    const friendRequest = await req.prisma.friendRequest.create({
      data: {
        senderId: req.userId,
        receiverId
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    await createNotification(req.prisma, {
      recipientId: receiverId,
      actorId: req.userId,
      type: 'friend_request',
      title: 'Friend request',
      message: `${friendRequest.sender.name} sent you a friend request`
    })

    res.status(201).json({
      message: 'Friend request sent',
      friendRequest
    })
  } catch (error) {
    console.error('Send friend request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get pending friend requests
router.get('/requests', async (req, res) => {
  try {
    const incomingRaw = await req.prisma.friendRequest.findMany({
      where: { receiverId: req.userId, status: 'PENDING' },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    const outgoingRaw = await req.prisma.friendRequest.findMany({
      where: { senderId: req.userId, status: 'PENDING' },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    const formatRequest = (r, incoming = false) => ({
      id: incoming ? r.sender.id : r.receiver.id,
      name: incoming ? r.sender.name : r.receiver.name,
      username: incoming ? r.sender.email : r.receiver.email,
      avatar: incoming ? r.sender.avatar : r.receiver.avatar,
      status: r.status.toLowerCase(),
      requestId: r.id,
      sender: {
        id: r.sender.id,
        name: r.sender.name,
        username: r.sender.email,
        avatar: r.sender.avatar
      },
      receiver: {
        id: r.receiver.id,
        name: r.receiver.name,
        username: r.receiver.email,
        avatar: r.receiver.avatar
      }
    })

    const incoming = incomingRaw.map(r => formatRequest(r, true))
    const outgoing = outgoingRaw.map(r => formatRequest(r, false))

    res.json({ incoming, outgoing })
  } catch (error) {
    console.error('Get friend requests error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get summary of amounts owed between user and friends
router.get('/summary', async (req, res) => {
  try {
    const friendships = await req.prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: req.userId },
          { user2Id: req.userId }
        ]
      },
      select: { user1Id: true, user2Id: true }
    })

    const friendIds = friendships.map(f =>
      f.user1Id === req.userId ? f.user2Id : f.user1Id
    )

    if (friendIds.length === 0) {
      return res.json({ owedToUser: 0, userOwes: 0 })
    }

    const pendingStatus = Object.keys(TRANSACTION_STATUS_MAP).find(
      key => TRANSACTION_STATUS_MAP[key] === 'pending'
    ) || 'PENDING'

    const [owedAgg, owesAgg, unpaidAsCreator, unpaidAsParticipant] = await req.prisma.$transaction([
      // Direct transactions where friends owe the user (exclude bill split placeholder tx)
      req.prisma.transaction.aggregate({
        where: {
          receiverId: req.userId,
          senderId: { in: friendIds },
          status: pendingStatus,
          NOT: { type: 'BILL_SPLIT' }
        },
        _sum: { amount: true }
      }),
      // Direct transactions where the user owes friends (exclude bill split placeholder tx)
      req.prisma.transaction.aggregate({
        where: {
          senderId: req.userId,
          receiverId: { in: friendIds },
          status: pendingStatus,
          NOT: { type: 'BILL_SPLIT' }
        },
        _sum: { amount: true }
      }),
      // Unpaid bill split shares where the user is creator and friends are participants (friends owe user)
      req.prisma.billSplitParticipant.aggregate({
        where: {
          userId: { in: friendIds },
          isPaid: false,
          billSplit: { createdBy: req.userId }
        },
        _sum: { amount: true }
      }),
      // Unpaid bill split shares where friends are creators and user is participant (user owes friends)
      req.prisma.billSplitParticipant.aggregate({
        where: {
          userId: req.userId,
          isPaid: false,
          billSplit: { createdBy: { in: friendIds } }
        },
        _sum: { amount: true }
      })
    ])

    const owedToUser = (owedAgg._sum.amount || 0) + (unpaidAsCreator._sum.amount || 0)
    const userOwes = (owesAgg._sum.amount || 0) + (unpaidAsParticipant._sum.amount || 0)

    res.json({ owedToUser, userOwes })
  } catch (error) {
    console.error('Get friends summary error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Accept friend request
router.post('/requests/:id/accept', async (req, res) => {
  try {
    const request = await req.prisma.friendRequest.findUnique({
      where: { id: req.params.id }
    })

    if (!request || request.receiverId !== req.userId) {
      return res.status(404).json({ error: 'Friend request not found' })
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Friend request is not pending' })
    }

    const [friendRequest, friendship] = await req.prisma.$transaction([
      req.prisma.friendRequest.update({
        where: { id: req.params.id },
        data: { status: 'ACCEPTED' },
        include: {
          sender: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          receiver: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      }),
      req.prisma.friendship.create({
        data: {
          user1Id: request.senderId,
          user2Id: request.receiverId
        }
      })
    ])

    await createNotification(req.prisma, {
      recipientId: friendRequest.senderId,
      actorId: req.userId,
      type: 'friend_request_accepted',
      title: 'Friend request accepted',
      message: `${friendRequest.receiver.name} accepted your friend request`
    })

    res.json({ friendRequest, friendship })
  } catch (error) {
    console.error('Accept friend request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Decline friend request
router.post('/requests/:id/decline', async (req, res) => {
  try {
    const request = await req.prisma.friendRequest.findUnique({
      where: { id: req.params.id }
    })

    if (!request || request.receiverId !== req.userId) {
      return res.status(404).json({ error: 'Friend request not found' })
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Friend request is not pending' })
    }

    const friendRequest = await req.prisma.friendRequest.update({
      where: { id: req.params.id },
      data: { status: 'DECLINED' },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    await createNotification(req.prisma, {
      recipientId: friendRequest.senderId,
      actorId: req.userId,
      type: 'friend_request_declined',
      title: 'Friend request declined',
      message: `${friendRequest.receiver.name} declined your friend request`
    })

    res.json({ friendRequest })
  } catch (error) {
    console.error('Decline friend request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Cancel friend request
router.delete('/requests/:id', async (req, res) => {
  try {
    const request = await req.prisma.friendRequest.findUnique({
      where: { id: req.params.id },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    if (!request || request.senderId !== req.userId) {
      return res.status(404).json({ error: 'Friend request not found' })
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Friend request is not pending' })
    }

    const friendRequest = await req.prisma.friendRequest.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    await createNotification(req.prisma, {
      recipientId: friendRequest.receiverId,
      actorId: req.userId,
      type: 'friend_request_cancelled',
      title: 'Friend request cancelled',
      message: `${friendRequest.sender.name} cancelled the friend request`
    })

    res.json({ friendRequest })
  } catch (error) {
    console.error('Cancel friend request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get friend details
router.get('/:friendId', async (req, res) => {
  try {
    const { friendId } = req.params

    const friendship = await req.prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: req.userId, user2Id: friendId },
          { user1Id: friendId, user2Id: req.userId }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, email: true, avatar: true } },
        user2: { select: { id: true, name: true, email: true, avatar: true } }
      }
    })

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' })
    }

    const friendUser = friendship.user1Id === req.userId ? friendship.user2 : friendship.user1

    const transactionsData = await req.prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: req.userId, receiverId: friendId },
          { senderId: friendId, receiverId: req.userId }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const transactions = transactionsData.map(t => {
      let type = TRANSACTION_TYPE_MAP[t.type] || t.type
      if (type === 'sent' || type === 'received') {
        type = t.senderId === req.userId ? 'sent' : 'received'
      }
      return {
        id: t.id,
        amount: t.amount,
        description: t.description,
        date: t.createdAt,
        type,
        status: TRANSACTION_STATUS_MAP[t.status] || t.status,
        sender: t.sender,
        recipient: t.receiver
      }
    })

    // Base balance from direct send/receive transactions only (exclude bill splits to avoid double counting)
    let balance = 0
    transactionsData.forEach(t => {
      if (t.type !== 'BILL_SPLIT') {
        if (t.receiverId === req.userId) balance += t.amount
        if (t.senderId === req.userId) balance -= t.amount
      }
    })

    // Add outstanding bill-split obligations between these two users
    const [friendOwesUser, userOwesFriend] = await req.prisma.$transaction([
      req.prisma.billSplitParticipant.aggregate({
        where: {
          userId: friendId,
          isPaid: false,
          billSplit: { createdBy: req.userId }
        },
        _sum: { amount: true }
      }),
      req.prisma.billSplitParticipant.aggregate({
        where: {
          userId: req.userId,
          isPaid: false,
          billSplit: { createdBy: friendId }
        },
        _sum: { amount: true }
      })
    ])
    const splitOwedToUser = friendOwesUser._sum.amount || 0
    const splitUserOwes = userOwesFriend._sum.amount || 0
    balance += splitOwedToUser
    balance -= splitUserOwes

    let currentBalance = null
    if (balance > 0) currentBalance = { amount: balance, type: 'owed' }
    else if (balance < 0) currentBalance = { amount: Math.abs(balance), type: 'owes' }

    const groups = await req.prisma.group.findMany({
      where: {
        members: {
          some: { userId: req.userId }
        },
        AND: {
          members: {
            some: { userId: friendId }
          }
        }
      },
      include: {
        _count: { select: { members: true } },
        members: { select: { userId: true } }
      }
    })

    const sharedGroups = await Promise.all(groups.map(async (g) => {
      const memberIds = g.members.map(m => m.userId)

      const txAggregate = await req.prisma.transaction.aggregate({
        where: {
          OR: [
            { senderId: req.userId, receiverId: friendId },
            { senderId: friendId, receiverId: req.userId }
          ],
          senderId: { in: memberIds },
          receiverId: { in: memberIds }
        },
        _sum: { amount: true }
      })

      const billSplits = await req.prisma.billSplit.findMany({
        where: {
          participants: {
            some: { userId: req.userId }
          },
          AND: {
            participants: {
              some: { userId: friendId }
            },
            participants: {
              every: { userId: { in: memberIds } }
            }
          }
        },
        include: { participants: true }
      })

      let billTotal = 0
      billSplits.forEach(bs => {
        bs.participants.forEach(p => {
          if (p.userId === req.userId || p.userId === friendId) {
            billTotal += p.amount
          }
        })
      })

      const totalSpent = (txAggregate._sum.amount || 0) + billTotal
      const currency = billSplits[0]?.currency

      return {
        id: g.id,
        name: g.name,
        memberCount: g._count.members,
        totalSpent,
        ...(currency ? { currency } : {}),
        color: g.color || 'bg-blue-500'
      }
    }))

    const method = await req.prisma.paymentMethod.findFirst({
      where: { userId: friendUser.id, isDefault: true }
    })

    res.json({
      friend: {
        id: friendUser.id,
        name: friendUser.name,
        username: friendUser.email,
        status: 'active',
        avatar: friendUser.avatar,
        joinedDate: friendship.createdAt,
        totalTransactions: transactions.length,
        currentBalance
      },
      paymentMethods: method ? [method] : [],
      transactions,
      sharedGroups
    })
  } catch (error) {
    console.error('Get friend error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Remove a friend
router.delete('/:friendId', async (req, res) => {
  try {
    const { friendId } = req.params

    const friendship = await req.prisma.friendship.findFirst({
      where: {
        OR: [
          { user1Id: req.userId, user2Id: friendId },
          { user1Id: friendId, user2Id: req.userId }
        ]
      }
    })

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' })
    }

    await req.prisma.friendship.delete({ where: { id: friendship.id } })

    res.json({ message: 'Friend removed' })
  } catch (error) {
    console.error('Delete friend error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
