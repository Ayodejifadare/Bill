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

