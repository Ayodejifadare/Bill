import express from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'

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
        user1: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        user2: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    // Extract friends (exclude current user)
    const friends = friendships.map(friendship => {
      return friendship.user1Id === req.userId ? friendship.user2 : friendship.user1
    })

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
