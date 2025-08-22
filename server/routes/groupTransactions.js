import express from 'express'
import { TRANSACTION_TYPE_MAP, TRANSACTION_STATUS_MAP } from '../../shared/transactions.js'

const router = express.Router({ mergeParams: true })

// GET /transactions?page=1 - list transactions for group
router.get('/transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const pageSize = 10
    const members = await req.prisma.groupMember.findMany({
      where: { groupId: req.params.groupId }
    })
    const memberIds = members.map((m) => m.userId)

    const transactions = await req.prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: { in: memberIds } },
          { receiverId: { in: memberIds } }
        ]
      },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize + 1
    })
    const hasMore = transactions.length > pageSize
    const slice = transactions.slice(0, pageSize)

    const formatted = slice.map((t) => ({
      id: t.id,
      type: TRANSACTION_TYPE_MAP[t.type] || t.type,
      amount: t.amount,
      description: t.description || '',
      date: t.createdAt.toISOString(),
      status: TRANSACTION_STATUS_MAP[t.status] || t.status,
      paidBy: t.sender?.name || t.senderId,
      participants: [t.sender?.name || t.senderId, t.receiver?.name || t.receiverId]
    }))
    // Response: { transactions: Transaction[], page, pageSize, hasMore }
    res.json({ page, pageSize, hasMore, transactions: formatted })
  } catch (error) {
    console.error('List group transactions error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /split-bill - create a simple split between first two members
router.post('/split-bill', async (req, res) => {
  try {
    const group = await req.prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: { members: true }
    })
    if (!group || group.members.length < 2) {
      return res.status(400).json({ error: 'Not enough members' })
    }
    const [m1, m2] = group.members
    const tx = await req.prisma.transaction.create({
      data: {
        senderId: m1.userId,
        receiverId: m2.userId,
        amount: 0,
        type: 'SEND',
        status: 'COMPLETED',
        description: 'Bill split'
      },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } }
      }
    })
    const formatted = {
      id: tx.id,
      type: TRANSACTION_TYPE_MAP[tx.type] || tx.type,
      amount: tx.amount,
      description: tx.description || '',
      date: tx.createdAt.toISOString(),
      status: TRANSACTION_STATUS_MAP[tx.status] || tx.status,
      paidBy: tx.sender?.name || tx.senderId,
      participants: [tx.sender?.name || tx.senderId, tx.receiver?.name || tx.receiverId]
    }
    res.status(201).json({ transaction: formatted })
  } catch (error) {
    console.error('Split bill error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
