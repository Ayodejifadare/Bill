import express from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'

import { TRANSACTION_TYPE_MAP, TRANSACTION_STATUS_MAP } from '../../shared/transactions.js'

import { createNotification } from '../utils/notifications.js'


const router = express.Router()

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { tokenVersion: true }
    })
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Get user's friends
router.get('/', authenticateToken, async (req, res) => {
  try {
    const friendships = await req.prisma.friendship.findMany({
      where: {
        OR: [
          { user1Id: req.userId },
          { user2Id: req.userId }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, email: true, avatar: true } },
        user2: { select: { id: true, name: true, email: true, avatar: true } }
      }
    })

    const friends = await Promise.all(friendships.map(async (friendship) => {
      const friendUser = friendship.user1Id === req.userId ? friendship.user2 : friendship.user1

      const lastTransaction = await req.prisma.transaction.findFirst({
        where: {
          OR: [
            { senderId: req.userId, receiverId: friendUser.id },
            { senderId: friendUser.id, receiverId: req.userId }
          ]
        },
        orderBy: { createdAt: 'desc' },
        select: { amount: true, senderId: true, receiverId: true }
      })

      let lastTransactionData
      if (lastTransaction) {
        lastTransactionData = {
          amount: lastTransaction.amount,
          type: lastTransaction.receiverId === req.userId ? 'owed' : 'owes'
        }
      }

      return {
        id: friendUser.id,
        name: friendUser.name,
        username: friendUser.email,
        avatar: friendUser.avatar,
        status: 'active',
        lastTransaction: lastTransactionData
      }
    }))

    const pendingRequestsData = await req.prisma.friendRequest.findMany({
      where: {
        receiverId: req.userId,
        status: 'PENDING'
      },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } }
      }
    })

    const pendingRequests = pendingRequestsData.map(r => ({
      id: r.sender.id,
      name: r.sender.name,
      username: r.sender.email,
      avatar: r.sender.avatar,
      status: 'pending',
      requestId: r.id
    }))

    res.json({ friends: [...friends, ...pendingRequests] })
  } catch (error) {
    console.error('Get friends error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Send friend request
router.post('/request', [
  authenticateToken,
  body('receiverId').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { receiverId } = req.body

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
router.get('/requests', authenticateToken, async (req, res) => {
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
router.get('/summary', authenticateToken, async (req, res) => {
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

    const [owedAgg, owesAgg] = await req.prisma.$transaction([
      req.prisma.transaction.aggregate({
        where: {
          receiverId: req.userId,
          senderId: { in: friendIds },
          status: pendingStatus
        },
        _sum: { amount: true }
      }),
      req.prisma.transaction.aggregate({
        where: {
          senderId: req.userId,
          receiverId: { in: friendIds },
          status: pendingStatus
        },
        _sum: { amount: true }
      })
    ])

    const owedToUser = owedAgg._sum.amount || 0
    const userOwes = owesAgg._sum.amount || 0

    res.json({ owedToUser, userOwes })
  } catch (error) {
    console.error('Get friends summary error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Accept friend request
router.post('/requests/:id/accept', authenticateToken, async (req, res) => {
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
router.post('/requests/:id/decline', authenticateToken, async (req, res) => {
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
router.delete('/requests/:id', authenticateToken, async (req, res) => {
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
router.get('/:friendId', authenticateToken, async (req, res) => {
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

    let balance = 0
    transactionsData.forEach(t => {
      if (t.receiverId === req.userId) balance += t.amount
      if (t.senderId === req.userId) balance -= t.amount
    })

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
router.delete('/:friendId', authenticateToken, async (req, res) => {
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
