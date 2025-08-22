import express from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'

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

// Create payment request
router.post(
  '/',
  [
    authenticateToken,
    body('amount').isFloat({ gt: 0 }),
    body('recipients').isArray({ min: 1 }),
    body('recipients.*').isString().notEmpty(),
    body('paymentMethod').isString().notEmpty(),
    body('description').optional().isString(),
    body('message').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { amount, recipients, paymentMethod, description, message } = req.body

      const method = await req.prisma.paymentMethod.findFirst({
        where: { id: paymentMethod, userId: req.userId }
      })
      if (!method) {
        return res.status(403).json({ error: 'Invalid payment method' })
      }

      const uniqueRecipients = [...new Set(recipients)]
      if (uniqueRecipients.some((id) => id === req.userId)) {
        return res.status(400).json({ error: 'Cannot request payment from yourself' })
      }

      const recipientsExist = await req.prisma.user.findMany({
        where: { id: { in: uniqueRecipients } },
        select: { id: true }
      })
      if (recipientsExist.length !== uniqueRecipients.length) {
        return res.status(400).json({ error: 'Invalid recipients' })
      }

      const requests = await Promise.all(
        uniqueRecipients.map((receiverId) =>
          req.prisma.paymentRequest.create({
            data: {
              senderId: req.userId,
              receiverId,
              amount,
              description,
              message,
              status: 'PENDING'
            },
            select: { id: true, status: true, message: true }
          })
        )
      )

      res.status(201).json({ requests })
    } catch (error) {
      console.error('Create payment request error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Get requests for the user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const requests = await req.prisma.paymentRequest.findMany({
      where: {
        OR: [
          { senderId: req.userId },
          { receiverId: req.userId }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar: true } },
        receiver: { select: { id: true, name: true, email: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ requests })
  } catch (error) {
    console.error('Get payment requests error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Accept payment request
router.post('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const request = await req.prisma.paymentRequest.findUnique({ where: { id } })

    if (!request || request.receiverId !== req.userId) {
      return res.status(404).json({ error: 'Request not found' })
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' })
    }

    const updated = await req.prisma.paymentRequest.update({
      where: { id },
      data: { status: 'ACCEPTED' }
    })

    const transaction = await req.prisma.transaction.create({
      data: {
        amount: updated.amount,
        description: updated.description,
        status: 'PENDING',
        type: 'REQUEST',
        senderId: updated.receiverId,
        receiverId: updated.senderId
      }
    })

    res.json({ request: updated, transaction })
  } catch (error) {
    console.error('Accept payment request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Decline payment request
router.post('/:id/decline', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const request = await req.prisma.paymentRequest.findUnique({ where: { id } })

    if (!request || request.receiverId !== req.userId) {
      return res.status(404).json({ error: 'Request not found' })
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed' })
    }

    const updated = await req.prisma.paymentRequest.update({
      where: { id },
      data: { status: 'DECLINED' }
    })

    res.json({ request: updated })
  } catch (error) {
    console.error('Decline payment request error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
