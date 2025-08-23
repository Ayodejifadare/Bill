import express from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'
import { TRANSACTION_TYPE_MAP, TRANSACTION_STATUS_MAP, TRANSACTION_CATEGORY_MAP } from '../../shared/transactions.js'
import { createNotification } from '../utils/notifications.js'

// Build reverse lookup maps for filters
const REVERSE_TRANSACTION_TYPE_MAP = Object.fromEntries(
  Object.entries(TRANSACTION_TYPE_MAP).map(([key, value]) => [value, key])
)
const REVERSE_TRANSACTION_STATUS_MAP = Object.fromEntries(
  Object.entries(TRANSACTION_STATUS_MAP).map(([key, value]) => [value, key])
)
const REVERSE_TRANSACTION_CATEGORY_MAP = Object.fromEntries(
  Object.entries(TRANSACTION_CATEGORY_MAP).map(([key, value]) => [value, key])
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

// Get distinct transaction categories for the current user
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await req.prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: req.userId },
          { receiverId: req.userId }
        ],
        category: { not: null }
      },
      distinct: ['category'],
      select: { category: true }
    })

    const mapped = categories
      .map(c => TRANSACTION_CATEGORY_MAP[c.category] || c.category)
      .filter(Boolean)

    res.json({ categories: mapped })
  } catch (error) {
    console.error('Get transaction categories error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

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
      keyword,
      includeSummary
    } = req.query

    const baseWhere = {}

    if (startDate || endDate) {
      baseWhere.createdAt = {}
      if (startDate) baseWhere.createdAt.gte = new Date(startDate)
      if (endDate) baseWhere.createdAt.lte = new Date(endDate)
    }

    if (type) {
      const mappedType = REVERSE_TRANSACTION_TYPE_MAP[type] || type
      baseWhere.type = mappedType
    }

    if (status) {
      const mappedStatus = REVERSE_TRANSACTION_STATUS_MAP[status] || status
      baseWhere.status = mappedStatus
    }

    if (category) {
      const mappedCategory = REVERSE_TRANSACTION_CATEGORY_MAP[category] || category
      baseWhere.category = mappedCategory
    }

    if (minAmount || maxAmount) {
      baseWhere.amount = {}
      if (minAmount) baseWhere.amount.gte = parseFloat(minAmount)
      if (maxAmount) baseWhere.amount.lte = parseFloat(maxAmount)
    }

    if (keyword) {
      const keywordFilter = {
        OR: [
          { description: { contains: keyword } },
          { billSplit: { title: { contains: keyword } } },
          { billSplit: { description: { contains: keyword } } },
          { sender: { name: { contains: keyword } } },
          { receiver: { name: { contains: keyword } } }
        ]
      }
      baseWhere.AND = Array.isArray(baseWhere.AND)
        ? [...baseWhere.AND, keywordFilter]
        : [keywordFilter]
    }

    const where = {
      ...baseWhere,
      OR: [
        { senderId: req.userId },
        { receiverId: req.userId }
      ]
    }

    const baseQuery = {
      where,
      select: {
        id: true,
        amount: true,
        description: true,
        status: true,
        type: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        senderId: true,
        receiverId: true,
        billSplitId: true,
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

    const formatted = transactions.map(({ createdAt, receiver, ...t }) => ({
      ...t,
      date: createdAt.toISOString(),
      recipient: receiver,
      type: TRANSACTION_TYPE_MAP[t.type] || t.type,
      status: TRANSACTION_STATUS_MAP[t.status] || t.status,
      ...(t.category
        ? { category: TRANSACTION_CATEGORY_MAP[t.category] || t.category }
        : {})
    }))
    let summaryData = {}
    if (includeSummary === 'true' || includeSummary === '1') {
      const completedStatus =
        REVERSE_TRANSACTION_STATUS_MAP['completed'] || 'COMPLETED'

      const sentWhere = {
        ...baseWhere,
        senderId: req.userId,
        ...(status ? {} : { status: completedStatus })
      }

      const receivedWhere = {
        ...baseWhere,
        receiverId: req.userId,
        ...(status ? {} : { status: completedStatus })
      }

      const [sentAgg, receivedAgg] = await req.prisma.$transaction([
        req.prisma.transaction.aggregate({
          where: sentWhere,
          _sum: { amount: true }
        }),
        req.prisma.transaction.aggregate({
          where: receivedWhere,
          _sum: { amount: true }
        })
      ])

      const totalSent = sentAgg._sum.amount || 0
      const totalReceived = receivedAgg._sum.amount || 0

      summaryData = {
        totalSent,
        totalReceived,
        netFlow: totalReceived - totalSent
      }
    }

    res.json({
      transactions: formatted,
      nextCursor,
      hasMore,
      total,
      pageCount,
      ...summaryData
    })
  } catch (error) {
    console.error('Get transactions error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get transaction summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type,
      status,
      category,
      minAmount,
      maxAmount,
      keyword
    } = req.query

    const baseWhere = {}

    if (startDate || endDate) {
      baseWhere.createdAt = {}
      if (startDate) baseWhere.createdAt.gte = new Date(startDate)
      if (endDate) baseWhere.createdAt.lte = new Date(endDate)
    }

    if (type) {
      const mappedType = REVERSE_TRANSACTION_TYPE_MAP[type] || type
      baseWhere.type = mappedType
    }

    if (status) {
      const mappedStatus = REVERSE_TRANSACTION_STATUS_MAP[status] || status
      baseWhere.status = mappedStatus
    }

    if (category) {
      const mappedCategory = REVERSE_TRANSACTION_CATEGORY_MAP[category] || category
      baseWhere.category = mappedCategory
    }

    if (minAmount || maxAmount) {
      baseWhere.amount = {}
      if (minAmount) baseWhere.amount.gte = parseFloat(minAmount)
      if (maxAmount) baseWhere.amount.lte = parseFloat(maxAmount)
    }

    if (keyword) {
      const keywordFilter = {
        OR: [
          { description: { contains: keyword } },
          { billSplit: { title: { contains: keyword } } },
          { billSplit: { description: { contains: keyword } } },
          { sender: { name: { contains: keyword } } },
          { receiver: { name: { contains: keyword } } }
        ]
      }
      baseWhere.AND = Array.isArray(baseWhere.AND)
        ? [...baseWhere.AND, keywordFilter]
        : [keywordFilter]
    }

    const completedStatus = REVERSE_TRANSACTION_STATUS_MAP['completed'] || 'COMPLETED'

    const sentWhere = {
      ...baseWhere,
      senderId: req.userId,
      ...(status ? {} : { status: completedStatus })
    }

    const receivedWhere = {
      ...baseWhere,
      receiverId: req.userId,
      ...(status ? {} : { status: completedStatus })
    }

    const [sentAgg, receivedAgg] = await req.prisma.$transaction([
      req.prisma.transaction.aggregate({
        where: sentWhere,
        _sum: { amount: true }
      }),
      req.prisma.transaction.aggregate({
        where: receivedWhere,
        _sum: { amount: true }
      })
    ])

    const totalSent = sentAgg._sum.amount || 0
    const totalReceived = receivedAgg._sum.amount || 0

    res.json({
      totalSent,
      totalReceived,
      netFlow: totalReceived - totalSent
    })
  } catch (error) {
    console.error('Get transactions summary error:', error)
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
        recipient: transaction.receiver,
        user: otherUser,
        ...(transaction.category
          ? { category: TRANSACTION_CATEGORY_MAP[transaction.category] || transaction.category }
          : {}),
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
  body('description').optional().trim(),
  body('category').optional().isIn(Object.values(TRANSACTION_CATEGORY_MAP))
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { receiverId, amount, description, category } = req.body
    const mappedCategory =
      category ? REVERSE_TRANSACTION_CATEGORY_MAP[category] || category : undefined

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
          status: 'COMPLETED',
          ...(mappedCategory ? { category: mappedCategory } : {})
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
      status: TRANSACTION_STATUS_MAP[transaction.status] || transaction.status,
      ...(transaction.category
        ? { category: TRANSACTION_CATEGORY_MAP[transaction.category] || transaction.category }
        : {})
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
