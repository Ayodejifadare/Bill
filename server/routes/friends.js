import express from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'
import { createNotification } from '../utils/notifications.js'

const router = express.Router()

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Temporary mock friends with payment methods
const mockFriends = [
  {
    id: '1',
    name: 'Alice Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
    phoneNumber: '+234 801 123 4567',
    paymentMethods: [
      {
        id: 'alice_bank_1',
        type: 'bank',
        bankName: 'Access Bank',
        accountNumber: '0123456789',
        accountHolderName: 'Alice Johnson',
        sortCode: '044',
        isDefault: true
      }
    ]
  },
  {
    id: '2',
    name: 'Bob Wilson',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    phoneNumber: '+234 802 234 5678',
    paymentMethods: [
      {
        id: 'bob_mm_1',
        type: 'mobile_money',
        provider: 'Opay',
        phoneNumber: '+234 802 234 5678',
        isDefault: true
      },
      {
        id: 'bob_bank_1',
        type: 'bank',
        bankName: 'Chase Bank',
        accountNumber: '****3456',
        routingNumber: '021000021',
        accountHolderName: 'Robert Wilson'
      }
    ]
  },
  {
    id: '3',
    name: 'Carol Davis',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    phoneNumber: '+234 803 345 6789',
    paymentMethods: [
      {
        id: 'carol_bank_1',
        type: 'bank',
        bankName: 'GTBank',
        accountNumber: '0234567890',
        accountHolderName: 'Carol Davis',
        sortCode: '058',
        isDefault: true
      }
    ]
  },
  {
    id: '4',
    name: 'David Brown',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    phoneNumber: '+234 804 456 7890',
    paymentMethods: [
      {
        id: 'david_mm_1',
        type: 'mobile_money',
        provider: 'PalmPay',
        phoneNumber: '+234 804 456 7890',
        isDefault: true
      }
    ]
  },
  {
    id: '5',
    name: 'Emma Garcia',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    phoneNumber: '+234 805 567 8901',
    paymentMethods: [
      {
        id: 'emma_bank_1',
        type: 'bank',
        bankName: 'First Bank',
        accountNumber: '3456789012',
        accountHolderName: 'Emma Garcia',
        sortCode: '011',
        isDefault: true
      }
    ]
  }
]

// Get user's friends
router.get('/', async (req, res) => {
  try {
    const friends = mockFriends.map(f => ({
      ...f,
      defaultPaymentMethod: f.paymentMethods.find(m => m.isDefault)
    }))
    res.json({ friends })
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
    const incoming = await req.prisma.friendRequest.findMany({
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

    const outgoing = await req.prisma.friendRequest.findMany({
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

    res.json({ incoming, outgoing })
  } catch (error) {
    console.error('Get friend requests error:', error)
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

    res.json({
      message: 'Friend request accepted',
      friendRequest,
      friendship
    })
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

    res.json({
      message: 'Friend request declined',
      friendRequest
    })
  } catch (error) {
    console.error('Decline friend request error:', error)
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
