import express from 'express'
import { body, validationResult, param } from 'express-validator'
import jwt from 'jsonwebtoken'
import { computeNextRun } from '../utils/recurringBillSplitScheduler.js'

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

// Get user's bill splits
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      groupId,
      category,
      minAmount,
      maxAmount,
      keyword,
      page = 1,
      size = 20
    } = req.query

    const amountFilter = {}
    if (minAmount) amountFilter.gte = parseFloat(minAmount)
    if (maxAmount) amountFilter.lte = parseFloat(maxAmount)

    const where = {
      OR: [
        { createdBy: req.userId },
        { participants: { some: { userId: req.userId } } }
      ],
      ...(groupId && { groupId }),
      ...(category && { category }),
      ...(minAmount || maxAmount ? { totalAmount: amountFilter } : {})
    }

    if (keyword) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
            {
              participants: {
                some: {
                  user: { name: { contains: keyword, mode: 'insensitive' } }
                }
              }
            }
          ]
        }
      ]
    }

    const pageNum = Math.max(parseInt(page), 1)
    const pageSize = Math.max(parseInt(size), 1)

    const [total, splits] = await req.prisma.$transaction([
      req.prisma.billSplit.count({ where }),
      req.prisma.billSplit.findMany({
        where,
        include: {
          creator: { select: { id: true, name: true } },
          participants: {
            include: { user: { select: { id: true, name: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize
      })
    ])

    const billSplits = splits.map(split => {
      const your = split.participants.find(p => p.userId === req.userId)
      const completed = split.participants.every(p => p.isPaid)

      return {
        id: split.id,
        title: split.title,
        totalAmount: split.totalAmount,
        yourShare: your ? your.amount : 0,
        status: completed ? 'completed' : 'pending',
        participants: split.participants.map(p => ({
          name: p.userId === req.userId ? 'You' : p.user.name,
          amount: p.amount,
          paid: p.isPaid
        })),
        createdBy: split.creator.id === req.userId ? 'You' : split.creator.name,
        date: split.createdAt.toISOString(),
        ...(split.groupId && { groupId: split.groupId }),
        ...(split.category && { category: split.category })
      }
    })

    res.json({
      billSplits,
      total,
      pageCount: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Get bill splits error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get bill split by ID
router.get(
  '/:id',
  [authenticateToken, param('id').trim().notEmpty().isString()],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { id } = req.params

      const billSplit = await req.prisma.billSplit.findUnique({
        where: { id },
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
          },
          items: true
        }
      })

      if (
        !billSplit ||
        (billSplit.createdBy !== req.userId &&
          !billSplit.participants.some(p => p.userId === req.userId))
      ) {
        return res.status(404).json({ error: 'Bill split not found' })
      }

      let paymentMethod = null
      if (billSplit.paymentMethodId) {
        const pm = await req.prisma.paymentMethod.findUnique({
          where: { id: billSplit.paymentMethodId }
        })
        if (pm) {
          paymentMethod = {
            id: pm.id,
            type: pm.type,
            bankName: pm.bank,
            accountNumber: pm.accountNumber,
            accountHolderName: pm.accountName,
            sortCode: pm.sortCode,
            routingNumber: pm.routingNumber,
            accountType: pm.accountType,
            provider: pm.provider,
            phoneNumber: pm.phoneNumber,
            isDefault: pm.isDefault
          }
        }
      }

      const paidCount = billSplit.participants.filter(p => p.isPaid).length
      const yourParticipant = billSplit.participants.find(p => p.userId === req.userId)

      const formatted = {
        id: billSplit.id,
        title: billSplit.title,
        totalAmount: billSplit.totalAmount,
        yourShare: yourParticipant ? yourParticipant.amount : 0,
        status: paidCount === billSplit.participants.length ? 'completed' : 'pending',
        date: billSplit.createdAt.toISOString(),
        ...(billSplit.location ? { location: billSplit.location } : {}),
        ...(billSplit.note ? { note: billSplit.note } : {}),
        ...(billSplit.splitMethod ? { splitMethod: billSplit.splitMethod } : {}),
        organizer: {
          name: billSplit.creator.id === req.userId ? 'You' : billSplit.creator.name,
          avatar: billSplit.creator.avatar || ''
        },
        creatorId: billSplit.creator.id,
        paymentMethod,
        participants: billSplit.participants.map(p => ({
          id: p.user.id,
          name: p.userId === req.userId ? 'You' : p.user.name,
          avatar: p.user.avatar || '',
          amount: p.amount,
          status: p.isPaid ? 'paid' : 'pending'
        })),
        items: billSplit.items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      }

      res.json({ billSplit: formatted })
    } catch (error) {
      console.error('Get bill split error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Create bill split
router.post(
  '/',
  [
    authenticateToken,
    body('title').trim().notEmpty(),
    body('totalAmount').isFloat({ min: 0.01 }),
    body('participants').isArray({ min: 1 }),
    body('participants.*.id').trim().notEmpty(),
    body('participants.*.amount').isFloat({ gt: 0 }),
    body('splitMethod').optional().isString(),
    body('groupId').optional().trim(),
    body('paymentMethodId').optional().trim(),
    body('isRecurring').optional().isBoolean(),
    body('frequency').optional().isString(),
    body('day').optional().isInt(),
    body('description').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const {
        title,
        totalAmount,
        participants,
        description,
        splitMethod,
        groupId,
        paymentMethodId,
        isRecurring = false,
        frequency,
        day
      } = req.body

      const billSplit = await req.prisma.$transaction(async prisma => {
        const newBillSplit = await prisma.billSplit.create({
          data: {
            title,
            description,
            totalAmount,
            createdBy: req.userId,
            ...(splitMethod && { splitMethod }),
            ...(groupId && { groupId }),
            ...(paymentMethodId && { paymentMethodId }),
            isRecurring
          }
        })

        await prisma.billSplitParticipant.createMany({
          data: participants.map(p => ({
            billSplitId: newBillSplit.id,
            userId: p.id,
            amount: p.amount
          }))
        })

        if (isRecurring && frequency) {
          const nextRun = computeNextRun(frequency, day)
          await prisma.recurringBillSplit.create({
            data: {
              billSplitId: newBillSplit.id,
              frequency,
              day,
              nextRun
            }
          })
        }

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
            },
            recurring: true
          }
        })
      })

      const { recurring, ...rest } = billSplit
      res.status(201).json({
        message: 'Bill split created successfully',
        billSplit: {
          ...rest,
          ...(recurring && { schedule: recurring })
        }
      })
    } catch (error) {
      console.error('Create bill split error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Update bill split
router.put(
  '/:id',
  [
    authenticateToken,
    param('id').trim().notEmpty(),
    body('title').trim().notEmpty(),
    body('items').isArray({ min: 1 }),
    body('items.*.name').trim().notEmpty(),
    body('items.*.price').isFloat({ gt: 0 }),
    body('items.*.quantity').isInt({ min: 1 }),
    body('participants').isArray({ min: 1 }),
    body('participants.*.id').trim().notEmpty(),
    body('participants.*.amount').isFloat({ gt: 0 }),
    body('splitMethod').isIn(['equal', 'percentage', 'custom']),
    body('paymentMethodId').trim().notEmpty(),
    body('location').optional().trim(),
    body('date').optional().isISO8601(),
    body('note').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { id } = req.params
      const {
        title,
        items,
        participants,
        splitMethod,
        paymentMethodId,
        location,
        date,
        note
      } = req.body

      // Ensure bill split exists and user is creator
      const existing = await req.prisma.billSplit.findUnique({
        where: { id },
        select: { createdBy: true }
      })

      if (!existing) {
        return res.status(404).json({ error: 'Bill split not found' })
      }

      if (existing.createdBy !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' })
      }

      const totalAmount = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      )

      const billSplit = await req.prisma.$transaction(async prisma => {
        // Update bill split record
        await prisma.billSplit.update({
          where: { id },
          data: {
            title,
            location,
            date: date ? new Date(date) : undefined,
            note,
            splitMethod,
            paymentMethodId,
            totalAmount
          }
        })

        // Replace line items
        await prisma.billItem.deleteMany({ where: { billSplitId: id } })
        await prisma.billItem.createMany({
          data: items.map(item => ({
            billSplitId: id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        })

        // Replace participants allocations
        await prisma.billSplitParticipant.deleteMany({
          where: { billSplitId: id }
        })
        await prisma.billSplitParticipant.createMany({
          data: participants.map(p => ({
            billSplitId: id,
            userId: p.id,
            amount: p.amount
          }))
        })

        // Return updated bill split with relations
        return prisma.billSplit.findUnique({
          where: { id },
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
            },
            items: true
          }
        })
      })

      res.json({ billSplit })
    } catch (error) {
      console.error('Update bill split error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
  )

// Mark payment status for current user
router.post(
  '/:id/payments',
  [
    authenticateToken,
    param('id').trim().notEmpty(),
    body('status').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { id } = req.params
      const { status = 'SENT' } = req.body

      const participant = await req.prisma.billSplitParticipant.findUnique({
        where: { billSplitId_userId: { billSplitId: id, userId: req.userId } }
      })

      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' })
      }

      const updateData = { status }
      if (status.toUpperCase() === 'CONFIRMED') {
        updateData.isPaid = true
      }

      await req.prisma.billSplitParticipant.update({
        where: { billSplitId_userId: { billSplitId: id, userId: req.userId } },
        data: updateData
      })

      res.json({ message: 'Payment status updated' })
    } catch (error) {
      console.error('Update payment status error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Settle bill split
router.post(
  '/:id/settle',
  [
    authenticateToken,
    param('id').trim().notEmpty(),
    body('receiptId').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { id } = req.params
      const { receiptId } = req.body

      const billSplit = await req.prisma.billSplit.findUnique({
        where: { id },
        include: { participants: true }
      })

      if (!billSplit) {
        return res.status(404).json({ error: 'Bill split not found' })
      }

      if (billSplit.createdBy !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' })
      }

      const allPaid = billSplit.participants.every(p => p.isPaid)
      if (!allPaid) {
        return res.status(400).json({ error: 'All participants must confirm payment before settling' })
      }

      const updated = await req.prisma.$transaction(async prisma => {
        // Record settlement transactions for participants if needed
        for (const participant of billSplit.participants) {
          if (participant.userId === billSplit.createdBy) continue

          const existing = await prisma.transaction.findFirst({
            where: {
              billSplitId: id,
              senderId: participant.userId,
              receiverId: billSplit.createdBy
            }
          })

          if (!existing) {
            await prisma.transaction.create({
              data: {
                senderId: participant.userId,
                receiverId: billSplit.createdBy,
                amount: participant.amount,
                description: `Settlement for ${billSplit.title}`,
                type: 'BILL_SPLIT',
                status: 'COMPLETED',
                billSplitId: id
              }
            })
          }
        }

        if (receiptId) {
          await prisma.receipt.update({
            where: { id: receiptId },
            data: { billSplitId: id }
          })
        }

        // Update bill split status
        return prisma.billSplit.update({
          where: { id },
          data: { status: 'SETTLED' },
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
            },
            items: true
          }
        })
      })

      res.json({ billSplit: updated })
    } catch (error) {
      console.error('Settle bill split error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Delete bill split
router.delete(
  '/:id',
  [authenticateToken, param('id').trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const { id } = req.params

      const existing = await req.prisma.billSplit.findUnique({
        where: { id },
        select: { createdBy: true }
      })

      if (!existing) {
        return res.status(404).json({ error: 'Bill split not found' })
      }

      if (existing.createdBy !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' })
      }

      await req.prisma.$transaction(async prisma => {
        await prisma.billItem.deleteMany({ where: { billSplitId: id } })
        await prisma.billSplitParticipant.deleteMany({ where: { billSplitId: id } })
        await prisma.billSplit.delete({ where: { id } })
      })

      res.json({ message: 'Bill split deleted successfully' })
    } catch (error) {
      console.error('Delete bill split error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
