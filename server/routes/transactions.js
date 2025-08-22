import express from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'
import { TRANSACTION_TYPE_MAP, TRANSACTION_STATUS_MAP } from '../../shared/transactions.js'
import { createNotification } from '../utils/notifications.js'

// Build reverse lookup maps for filters
const REVERSE_TRANSACTION_TYPE_MAP = Object.fromEntries(
  Object.entries(TRANSACTION_TYPE_MAP).map(([key, value]) => [value, key])
)
const REVERSE_TRANSACTION_STATUS_MAP = Object.fromEntries(
  Object.entries(TRANSACTION_STATUS_MAP).map(([key, value]) => [value, key])
)

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

// Get user's transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      cursor,
      limit,
      page,
      size,
      startDate,
      endDate,
      type,
      status,
      category,
      minAmount,
      maxAmount,
      keyword
    } = req.query

    const where = {
      OR: [
        { senderId: req.userId },
        { receiverId: req.userId }
      ]
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    if (type) {
      const mappedType = REVERSE_TRANSACTION_TYPE_MAP[type] || type
      where.type = mappedType
    }

    if (status) {
      const mappedStatus = REVERSE_TRANSACTION_STATUS_MAP[status] || status
      where.status = mappedStatus
    }

    if (category) {
      where.category = category
    }

    if (minAmount || maxAmount) {
      where.amount = {}
      if (minAmount) where.amount.gte = parseFloat(minAmount)
      if (maxAmount) where.amount.lte = parseFloat(maxAmount)
    }

    if (keyword) {
      const keywordFilter = {
        OR: [
          { description: { contains: keyword, mode: 'insensitive' } },
          { billSplit: { title: { contains: keyword, mode: 'insensitive' } } },
          { billSplit: { description: { contains: keyword, mode: 'insensitive' } } },
          { sender: { name: { contains: keyword, mode: 'insensitive' } } },
          { receiver: { name: { contains: keyword, mode: 'insensitive' } } }
        ]
      }
      where.AND = Array.isArray(where.AND) ? [...where.AND, keywordFilter] : [keywordFilter]
    }

    const baseQuery = {
      where,
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }

    let transactions
    let nextCursor = null
    let hasMore = false
    let total = 0
    let pageCount = 0

    const isPageBased = page !== undefined || size !== undefined
    if (isPageBased) {
      const pageNum = parseInt(page) || 1
      const pageSize = parseInt(size) || parseInt(limit) || 20

      const [totalCount, result] = await req.prisma.$transaction([
        req.prisma.transaction.count({ where }),
        req.prisma.transaction.findMany({
          ...baseQuery,
          skip: (pageNum - 1) * pageSize,
          take: pageSize
        })
      ])

      transactions = result
      total = totalCount
      pageCount = Math.ceil(total / pageSize)
      hasMore = pageNum < pageCount
    } else {
      const pageSize = parseInt(limit) || parseInt(size) || 20

      const result = await req.prisma.transaction.findMany({
        ...baseQuery,
        take: pageSize + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
      })

      transactions = result

      if (transactions.length > pageSize) {
        const nextItem = transactions.pop()
        nextCursor = nextItem.id
        hasMore = true
      }

      total = await req.prisma.transaction.count({ where })
      pageCount = Math.ceil(total / pageSize)
    }

    const formatted = transactions.map(t => ({
      ...t,
      type: TRANSACTION_TYPE_MAP[t.type] || t.type,
      status: TRANSACTION_STATUS_MAP[t.status] || t.status,
      ...(t.category ? { category: t.category } : {})
    }))

    res.json({
      transactions: formatted,
      nextCursor,
      hasMore,
      total,
      pageCount
    })
  } catch (error) {
    console.error('Get transactions error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single transaction
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const transaction = await req.prisma.transaction.findUnique({
      where: { id },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        billSplit: {
          include: { participants: true }
        }
      }
    })

    if (
      !transaction ||
      (transaction.senderId !== req.userId && transaction.receiverId !== req.userId)
    ) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    let paymentMethod = null
    if (transaction.billSplit?.paymentMethodId) {
      const pm = await req.prisma.paymentMethod.findUnique({
        where: { id: transaction.billSplit.paymentMethodId }
      })
      if (pm) {
        paymentMethod = {
          type: pm.type,
          bankName: pm.bank,
          accountNumber: pm.accountNumber,
          accountHolderName: pm.accountName,
          sortCode: pm.sortCode,
          routingNumber: pm.routingNumber,
          accountType: pm.accountType,
          provider: pm.provider,
          phoneNumber: pm.phoneNumber
        }
      }
    }

    let type = TRANSACTION_TYPE_MAP[transaction.type] || transaction.type
    if (type === 'sent' || type === 'received') {
      type = transaction.senderId === req.userId ? 'sent' : 'received'
    }

    const otherUser =
      transaction.senderId === req.userId
        ? transaction.receiver
        : transaction.sender

    const formatted = {
      id: transaction.id,
      amount: transaction.amount,
      description: transaction.description || '',
      date: transaction.createdAt.toISOString(),
      type,
      status: TRANSACTION_STATUS_MAP[transaction.status] || transaction.status,
      sender: transaction.sender,
      receiver: transaction.receiver,
      user: otherUser,
      ...(transaction.billSplit?.location
        ? { location: transaction.billSplit.location }
        : {}),
      ...(transaction.billSplit?.note ? { note: transaction.billSplit.note } : {}),
      ...(transaction.billSplit
        ? {
            totalParticipants: transaction.billSplit.participants.length,
            paidParticipants: transaction.billSplit.participants.filter((p) => p.isPaid).length
          }
        : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      transactionId: transaction.id
    }

    res.json({ transaction: formatted })
  } catch (error) {
    console.error('Get transaction error:', error)
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

    const formatted = {
      ...transaction,
      type: TRANSACTION_TYPE_MAP[transaction.type] || transaction.type,
      status: TRANSACTION_STATUS_MAP[transaction.status] || transaction.status
    }

    await createNotification(req.prisma, {
      recipientId: receiverId,
      actorId: req.userId,
      type: 'payment_received',
      title: 'Payment received',
      message: `${transaction.sender.name} sent you ${amount}`,
      amount
    })

    res.status(201).json({
      message: 'Money sent successfully',
      transaction: formatted
    })
  } catch (error) {
    console.error('Send money error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
