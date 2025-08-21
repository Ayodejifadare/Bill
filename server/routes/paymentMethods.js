import express from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'

const router = express.Router()

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

// Get all payment methods for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const methods = await req.prisma.paymentMethod.findMany({
      where: { userId: req.userId }
    })
    res.json(methods)
  } catch (error) {
    console.error('Get payment methods error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create new payment method
router.post(
  '/',
  [
    authenticateToken,
    body('type').trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const {
        type,
        bank,
        accountNumber,
        accountName,
        sortCode,
        routingNumber,
        accountType,
        provider,
        phoneNumber,
        isDefault
      } = req.body

      if (isDefault) {
        await req.prisma.paymentMethod.updateMany({
          where: { userId: req.userId, isDefault: true },
          data: { isDefault: false }
        })
      }

      const method = await req.prisma.paymentMethod.create({
        data: {
          type,
          bank,
          accountNumber,
          accountName,
          sortCode,
          routingNumber,
          accountType,
          provider,
          phoneNumber,
          isDefault: !!isDefault,
          userId: req.userId
        }
      })

      res.status(201).json(method)
    } catch (error) {
      console.error('Create payment method error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Update payment method
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const existing = await req.prisma.paymentMethod.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ error: 'Payment method not found' })
    }

    if (req.body.isDefault) {
      await req.prisma.paymentMethod.updateMany({
        where: { userId: req.userId, isDefault: true },
        data: { isDefault: false }
      })
    }

    const data = {
      type: req.body.type,
      bank: req.body.bank,
      accountNumber: req.body.accountNumber,
      accountName: req.body.accountName,
      sortCode: req.body.sortCode,
      routingNumber: req.body.routingNumber,
      accountType: req.body.accountType,
      provider: req.body.provider,
      phoneNumber: req.body.phoneNumber,
      isDefault: req.body.isDefault
    }

    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key])

    const method = await req.prisma.paymentMethod.update({
      where: { id },
      data
    })

    res.json(method)
  } catch (error) {
    console.error('Update payment method error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete payment method
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const existing = await req.prisma.paymentMethod.findFirst({
      where: { id, userId: req.userId }
    })
    if (!existing) {
      return res.status(404).json({ error: 'Payment method not found' })
    }

    await req.prisma.paymentMethod.delete({ where: { id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Delete payment method error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

