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

// POST /split-bill - split a bill between group members
router.post('/split-bill', async (req, res) => {
  try {
    const { amount, participants = [] } = req.body || {}

    if (!amount || !Array.isArray(participants) || participants.length < 2) {
      return res
        .status(400)
        .json({ error: 'Amount and at least two participants required' })
    }

    // Ensure group exists and get members
    const group = await req.prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: { members: true }
    })
    if (!group) {
      return res.status(404).json({ error: 'Group not found' })
    }

    const memberIds = group.members.map((m) => m.userId)
    // verify all participants are members of the group
    const invalid = participants.find((id) => !memberIds.includes(id))
    if (invalid) {
      return res.status(400).json({ error: 'Invalid participant' })
    }

    // first participant is considered the payer
    const payerId = participants[0]
    const share = amount / participants.length

    const result = await req.prisma.$transaction(async (prisma) => {
      // Create bill split
      const billSplit = await prisma.billSplit.create({
        data: {
          title: 'Group bill split',
          totalAmount: amount,
          createdBy: payerId,
          description: 'Bill split'
        }
      })

      // Create participants
      await prisma.billSplitParticipant.createMany({
        data: participants.map((id) => ({
          billSplitId: billSplit.id,
          userId: id,
          amount: share
        }))
      })

      const newTransactions = []
      for (const id of participants) {
        if (id === payerId) continue

        const tx = await prisma.transaction.create({
          data: {
            senderId: payerId,
            receiverId: id,
            amount: share,
            type: 'SEND',
            status: 'COMPLETED',
            description: 'Bill split',
            billSplitId: billSplit.id
          },
          include: {
            sender: { select: { id: true, name: true } },
            receiver: { select: { id: true, name: true } }
          }
        })
        newTransactions.push(tx)

        // Update balances
        await prisma.user.update({
          where: { id: payerId },
          data: { balance: { decrement: share } }
        })
        await prisma.user.update({
          where: { id },
          data: { balance: { increment: share } }
        })
      }

      // Fetch all group transactions after the split
      const allTx = await prisma.transaction.findMany({
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
        orderBy: { createdAt: 'desc' }
      })

      // Calculate balances for all group members
      const balances = {}
      memberIds.forEach((id) => (balances[id] = 0))
      allTx.forEach((t) => {
        if (balances[t.senderId] !== undefined) balances[t.senderId] -= t.amount
        if (balances[t.receiverId] !== undefined) balances[t.receiverId] += t.amount
      })

      const formatted = allTx.map((t) => ({
        id: t.id,
        type: TRANSACTION_TYPE_MAP[t.type] || t.type,
        amount: t.amount,
        description: t.description || '',
        date: t.createdAt.toISOString(),
        status: TRANSACTION_STATUS_MAP[t.status] || t.status,
        paidBy: t.sender?.name || t.senderId,
        participants: [
          t.sender?.name || t.senderId,
          t.receiver?.name || t.receiverId
        ]
      }))

      return { billSplitId: billSplit.id, transactions: formatted, balances }
    })

    res.status(201).json(result)
  } catch (error) {
    console.error('Split bill error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
