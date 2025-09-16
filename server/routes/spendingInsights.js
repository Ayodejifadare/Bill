import express from 'express'
import authenticate from '../middleware/auth.js'
import generateInsights from '../utils/insights.js'

const router = express.Router()

// GET /spending-insights
router.get('/spending-insights', authenticate, async (req, res) => {
  try {
    const { period = 'This Month' } = req.query
    const now = new Date()
    let startDate

    switch (period) {
      case 'This Week': {
        const day = (now.getDay() + 6) % 7 // Monday = 0
        startDate = new Date(now)
        startDate.setDate(now.getDate() - day)
        break
      }
      case 'Last 3 Months': {
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        break
      }
      case 'This Year': {
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      }
      case 'This Month':
      default: {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      }
    }

    const transactions = await req.prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: req.user.id },
          { receiverId: req.user.id }
        ],
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      select: {
        amount: true,
        createdAt: true,
        senderId: true,
        receiverId: true,
        type: true,
        billSplitId: true
      }
    })

    // Total spending (outgoing)
    const total = transactions
      .filter(t => t.senderId === req.user.id)
      .reduce((sum, t) => sum + t.amount, 0)

    // Monthly trends for last 6 months
    const monthlyTrends = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthlyTrends.push({
        month: date.toLocaleString('default', { month: 'short' }),
        sent: 0,
        received: 0,
        splits: 0
      })
    }

    transactions.forEach(tx => {
      const diff = (now.getFullYear() - tx.createdAt.getFullYear()) * 12 +
        (now.getMonth() - tx.createdAt.getMonth())
      if (diff >= 0 && diff < 6) {
        const index = 5 - diff
        if (tx.senderId === req.user.id) monthlyTrends[index].sent += tx.amount
        if (tx.receiverId === req.user.id) monthlyTrends[index].received += tx.amount
        if (tx.type === 'BILL_SPLIT' || tx.type === 'SPLIT' || tx.billSplitId) {
          monthlyTrends[index].splits += 1
        }
      }
    })

    // Weekly activity for current week (Mon-Sun)
    const weeklyActivity = []
    const startOfWeek = new Date(now)
    const day = (now.getDay() + 6) % 7
    startOfWeek.setDate(now.getDate() - day)
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      weeklyActivity.push({
        day: date.toLocaleString('default', { weekday: 'short' }),
        amount: 0
      })
    }

    transactions.forEach(tx => {
      if (tx.createdAt >= startOfWeek) {
        const d = (tx.createdAt.getDay() + 6) % 7
        weeklyActivity[d].amount += tx.amount
      }
    })

    // Load user's region/currency for region-aware messages
    const me = await req.prisma.user.findUnique({ where: { id: req.user.id }, select: { region: true, currency: true } })
    const insights = generateInsights(transactions, req.user.id, { region: me?.region, currency: me?.currency })

    res.json({
      currentMonth: { total, categories: [] },
      monthlyTrends,
      weeklyActivity,
      goals: [],
      insights
    })
  } catch (err) {
    console.error('Spending insights error:', err)
    res.status(500).json({ error: 'Failed to fetch spending insights' })
  }
})

export default router
