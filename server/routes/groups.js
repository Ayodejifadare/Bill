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

// Get user's groups
router.get('/', authenticateToken, async (req, res) => {
  try {
    const groups = await req.prisma.group.findMany({
      where: {
        members: {
          some: { userId: req.userId }
        }
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ groups })
  } catch (error) {
    console.error('Get groups error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create group with members
router.post('/', [
  authenticateToken,
  body('name').trim().notEmpty(),
  body('memberIds').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name, description, color, memberIds = [] } = req.body

    const group = await req.prisma.$transaction(async (prisma) => {
      const newGroup = await prisma.group.create({
        data: {
          name,
          description,
          color,
          createdBy: req.userId
        }
      })

      const membersData = [
        { groupId: newGroup.id, userId: req.userId, role: 'OWNER' },
        ...memberIds.map(id => ({ groupId: newGroup.id, userId: id, role: 'MEMBER' }))
      ]

      if (membersData.length > 0) {
        await prisma.groupMember.createMany({ data: membersData })
      }

      return prisma.group.findUnique({
        where: { id: newGroup.id },
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true }
              }
            }
          }
        }
      })
    })

    res.status(201).json({
      message: 'Group created successfully',
      group
    })
  } catch (error) {
    console.error('Create group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get group details with recent transactions
router.get('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params

    // Verify membership
    const membership = await req.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } }
    })

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' })
    }

    const group = await req.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        }
      }
    })

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const PAGE_SIZE = 10
    const transactions = await req.prisma.transaction.findMany({
      where: { groupId },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1
    })

    const hasMoreTransactions = transactions.length > PAGE_SIZE
    const recentTransactions = transactions.slice(0, PAGE_SIZE)

    res.json({
      group: {
        ...group,
        recentTransactions,
        hasMoreTransactions
      }
    })
  } catch (error) {
    console.error('Get group details error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get paginated group transactions
router.get('/:groupId/transactions', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params
    const page = parseInt(req.query.page) || 1
    const PAGE_SIZE = 10

    // Verify membership
    const membership = await req.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } }
    })

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' })
    }

    const transactions = await req.prisma.transaction.findMany({
      where: { groupId },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    })

    res.json({ transactions })
  } catch (error) {
    console.error('Get group transactions error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create bill split within a group
router.post('/:groupId/split-bill', [
  authenticateToken,
  body('title').trim().notEmpty(),
  body('totalAmount').isFloat({ min: 0.01 }),
  body('participants').isArray({ min: 1 }),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { groupId } = req.params
    const { title, totalAmount, participants, description } = req.body

    // Verify membership
    const membership = await req.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } }
    })

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' })
    }

    // Ensure all participants are members of the group
    const validParticipants = await req.prisma.groupMember.findMany({
      where: { groupId, userId: { in: participants } },
      select: { userId: true }
    })

    if (validParticipants.length !== participants.length) {
      return res.status(400).json({ error: 'All participants must be group members' })
    }

    const amountPerParticipant = totalAmount / participants.length

    const billSplit = await req.prisma.$transaction(async (prisma) => {
      const newBillSplit = await prisma.billSplit.create({
        data: {
          title,
          description,
          totalAmount,
          createdBy: req.userId,
          groupId
        }
      })

      await prisma.billSplitParticipant.createMany({
        data: participants.map(userId => ({
          billSplitId: newBillSplit.id,
          userId,
          amount: amountPerParticipant
        }))
      })

      return prisma.billSplit.findUnique({
        where: { id: newBillSplit.id },
        include: {
          creator: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          participants: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true }
              }
            }
          }
        }
      })
    })

    res.status(201).json({
      message: 'Bill split created successfully',
      billSplit
    })
  } catch (error) {
    console.error('Create group bill split error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Join group
router.post('/:groupId/join', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params

    const existingMember = await req.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } }
    })

    if (existingMember) {
      return res.status(400).json({ error: 'Already a member' })
    }

    const group = await req.prisma.group.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    await req.prisma.groupMember.create({
      data: {
        groupId,
        userId: req.userId,
        role: 'MEMBER'
      }
    })

    res.json({ message: 'Joined group successfully' })
  } catch (error) {
    console.error('Join group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Leave group
router.post('/:groupId/leave', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params

    const membership = await req.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.userId } }
    })

    if (!membership) {
      return res.status(400).json({ error: 'Not a member of this group' })
    }

    await req.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: req.userId } }
    })

    res.json({ message: 'Left group successfully' })
  } catch (error) {
    console.error('Leave group error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

