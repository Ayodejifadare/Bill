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

// Get user's transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const transactions = await req.prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: req.userId },
          { receiverId: req.userId }
        ]
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ transactions })
  } catch (error) {
    console.error('Get transactions error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Send money
router.post('/send', [
  authenticateToken,
  body('receiverId').notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { receiverId, amount, description } = req.body

    // Check if receiver exists
    const receiver = await req.prisma.user.findUnique({
      where: { id: receiverId }
    })

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' })
    }

    // Check if user has sufficient balance (in a real app, you'd integrate with payment provider)
    const sender = await req.prisma.user.findUnique({
      where: { id: req.userId }
    })

    if (sender.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    // Create transaction and update balances
    const transaction = await req.prisma.$transaction(async (prisma) => {
      // Create transaction record
      const newTransaction = await prisma.transaction.create({
        data: {
          senderId: req.userId,
          receiverId,
          amount,
          description,
          type: 'SEND',
          status: 'COMPLETED'
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

      // Update sender balance
      await prisma.user.update({
        where: { id: req.userId },
        data: { balance: { decrement: amount } }
      })

      // Update receiver balance
      await prisma.user.update({
        where: { id: receiverId },
        data: { balance: { increment: amount } }
      })

      return newTransaction
    })

    res.status(201).json({
      message: 'Money sent successfully',
      transaction
    })
  } catch (error) {
    console.error('Send money error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router