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

// Get user's bill splits
router.get('/', authenticateToken, async (req, res) => {
  try {
    const billSplits = await req.prisma.billSplit.findMany({
      where: {
        OR: [
          { createdBy: req.userId },
          { 
            participants: {
              some: { userId: req.userId }
            }
          }
        ]
      },
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
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ billSplits })
  } catch (error) {
    console.error('Get bill splits error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create bill split
router.post('/', [
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

    const { title, totalAmount, participants, description } = req.body

    // Calculate amount per participant
    const amountPerParticipant = totalAmount / participants.length

    // Create bill split with participants
    const billSplit = await req.prisma.$transaction(async (prisma) => {
      // Create bill split
      const newBillSplit = await prisma.billSplit.create({
        data: {
          title,
          description,
          totalAmount,
          createdBy: req.userId
        }
      })

      // Create participants
      await prisma.billSplitParticipant.createMany({
        data: participants.map(userId => ({
          billSplitId: newBillSplit.id,
          userId,
          amount: amountPerParticipant
        }))
      })

      // Return bill split with participants
      return await prisma.billSplit.findUnique({
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
    console.error('Create bill split error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router